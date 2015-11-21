"use strict";

var _ = require('underscore');
var gameHelper = require('../helpers/gameHelper');
var resolveStoryHelper = require('../helpers/resolveStoryHelper');
var Promise = require('bluebird');
var Game = require('../database/redis/game');
var CardPassive = require('../cards/passive');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');
var played = require('../database/redis/played');
var committed = require('../database/redis/committed');
var attached = require('../database/redis/attached');
var resourced = require('../database/redis/resourced');

exports.displayTable = function (socket) {
    return Promise.try(function () {
        return Game.getState(socket.userId);
    }).then(function (data) {
        socket.emit('gameState', data);
    });
};

exports.drawCard = function (socket) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'drawCard')) {
            return false;
        }

        return Promise.try(function () {
            return deck.drawToHand(game.id, socket.userId);
        }).then(function (result) {
            if (!result) {
                //TODO
                //player lost the game
            }
        }).then(function () {
            return hand.count(game.id, socket.userId);
        }).then(function (count) {
            if (game.phase == 'setup' && count === 8) {
                player.actions = ['resourceCard'];
                game = gameHelper.updatePlayer(game, player);
            } else if (game.phase == 'draw') {
                game.temp.drawnCards += 1;

                if (game.temp.drawnCards == 2 || (game.turn == 1 && game.firstPlayer == player.id && game.temp.drawnCards == 1)) {
                    player.actions = ['takeAction', 'noAction'];
                    game = gameHelper.updatePlayer(game, player);
                    game.temp.drawnCards = 0;
                    game.step = 'takeAction';
                }
            }

            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};

function updateAndBroadcastGameState(socket, game, player, opponent) {
    return Game.update(game).then(function () {
        var storyCard1Id = game.storyCards[0].id;
        var storyCard2Id = game.storyCards[1].id;
        var storyCard3Id = game.storyCards[2].id;
        var storyCard4Id = game.storyCards[3] ? game.storyCards[3].id : 0;
        var storyCard5Id = game.storyCards[4] ? game.storyCards[4].id : 0;

        return Promise.props({
            attachmentCards: attached.all(game.id),
            playerPlayed: played.all(game.id, player.id),
            opponentPlayed: played.all(game.id, opponent.id),
            playerCommitted1: committed.all(game.id, player.id, storyCard1Id),
            opponentCommitted1: committed.all(game.id, opponent.id, storyCard1Id),
            playerCommitted2: committed.all(game.id, player.id, storyCard2Id),
            opponentCommitted2: committed.all(game.id, opponent.id, storyCard2Id),
            playerCommitted3: committed.all(game.id, player.id, storyCard3Id),
            opponentCommitted3: committed.all(game.id, opponent.id, storyCard3Id),
            playerCommitted4: committed.all(game.id, player.id, storyCard4Id),
            opponentCommitted4: committed.all(game.id, opponent.id, storyCard4Id),
            playerCommitted5: committed.all(game.id, player.id, storyCard5Id),
            opponentCommitted5: committed.all(game.id, opponent.id, storyCard5Id)
        }).then(function (result) {
            return CardPassive.execute(game, result);
        }).then(function () {
            return Promise.props({
                playerData: Game.getState(player.id),
                opponentData: Game.getState(opponent.id)
            }).then(function (data) {
                socket.emit('gameState', data.playerData);
                socket.broadcast.emit('gameState', data.opponentData);
            });
        });
    });
}

exports.resourceCard = function (socket, data) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'resourceCard')) {
            return false;
        }

        return Promise.try(function () {
            if (game.phase == 'setup') {
                return Promise.try(function () {
                    return resourced.count(game.id, player.id, data.domainId);
                });
            }
        }).then(function (count) {
            if (count == 1) {
                return false;
            } else {
                return Promise.try(function () {
                    return hand.resource(game.id, player.id, data.domainId, data.cardId);
                }).then(function () {
                    if (game.phase == 'setup') {
                        return Promise.try(function () {
                            return Promise.props({
                                playerCount: resourced.countAll(game.id, player.id),
                                opponentCount: resourced.countAll(game.id, opponent.id)
                            });
                        }).then(function (count) {
                            if (count.playerCount == 3 && count.opponentCount == 3) {
                                game.turn = 1;
                                game.activePlayer = game.firstPlayer;
                                game.turnPlayer = game.activePlayer;
                                game.phase = 'refresh';
                                game.step = 'refreshAll';

                                game.players.forEach(function (p, i) {
                                    if (p.id == game.activePlayer) {
                                        game.players[i].actions = ['refreshAll'];
                                    } else {
                                        game.players[i].actions = [];
                                    }
                                });
                            }

                            return updateAndBroadcastGameState(socket, game, player, opponent);
                        });
                    } else if (game.phase == 'resource') {
                        player.actions = ['takeAction', 'noAction'];

                        game = gameHelper.updatePlayer(game, player);
                        game.step = 'takeAction';

                        return updateAndBroadcastGameState(socket, game, player, opponent);
                    }
                });
            }
        });
    });
};

exports.restoreInsane = function (socket, data) {
    var cardId = data.cardId;

    if (!cardId) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'restoreInsane')) {
            return false;
        }

        return played.get(game.id, player.id, cardId).then(function (card) {
            player.actions = ['refreshAll'];
            game = gameHelper.updatePlayer(game, player);
            game.step = 'refreshAll';
            game.temp.insaneRestored = card.id;
            card.status = 'exhausted';

            return played.update(game.id, player.id, card).then(function () {
                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.refreshAll = function (socket) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'refreshAll')) {
            return false;
        }

        player.domains.forEach(function (domain) {
            domain.status = 'active';
        });
        player.actions = ['takeAction', 'noAction'];

        game = gameHelper.updatePlayer(game, player);
        game.step = 'takeAction';

        return played.all(game.id, player.id).then(function (cards) {
            return Promise.map(cards, function (card) {
                if (card.status == 'exhausted' && game.temp.insaneRestored != card.id) {
                    card.status = 'active';

                    return played.update(game.id, player.id, card);
                }
            }).then(function () {
                game.temp.insaneRestored = 0;

                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.playCard = function (socket, data) {
    var cardId = data.cardId;
    var domainId = data.domainId;

    if (!cardId) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'playCard')) {
            return false;
        }

        return Promise.props({
            card: hand.get(game.id, player.id, cardId),
            resources: resourced.all(game.id, player.id, domainId)
        }).then(function (result) {
            var card = result.card;

            if (card.cost > 0) {
                var resources = result.resources;
                var domain = gameHelper.domain(game, player.id, domainId);
                var resourceMatch = gameHelper.resourceMatch(resources, card);

                if (domain.status != 'active' || card.cost > resources.length || !resourceMatch) {
                    return false;
                }

                domain.status = 'drained';
                game = gameHelper.updateDomain(game, domain, player.id);
            }

            return hand.play(game.id, player.id, card.id).then(function () {
                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.attachCard = function (socket, data) {
    var attachableId = data.attachableId;
    var attachmentId = data.attachmentId;
    var domainId = data.domainId;
    var section = data.section;
    var sectionId = data.sectionId;

    if (!attachableId || !attachmentId || domainId === null || !section) {
        return false;
    }

    if ((section == 'playerCommitted' || section == 'opponentCommitted') && !sectionId) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'playCard')) {
            return false;
        }

        var card;

        if (section == 'playerPlayed') {
            card = played.get(game.id, player.id, attachableId);
        } else if (section == 'opponentPlayed') {
            card = played.get(game.id, opponent.id, attachableId);
        } else if (section == 'playerCommitted') {
            card = committed.get(game.id, player.id, sectionId, attachableId);
        } else if (section == 'opponentCommitted') {
            card = committed.get(game.id, opponent.id, sectionId, attachableId);
        } else if (section == 'storyCards') {
            card = storyCard.get(game.id, attachableId);
        }

        return Promise.props({
            attachableCard: card,
            attachmentCard: hand.get(game.id, player.id, attachmentId),
            resources: resourced.all(game.id, player.id, domainId)
        }).then(function (result) {
            var attachableCard = result.attachableCard;
            var attachmentCard = result.attachmentCard;
            var resources = result.resources;
            var domain = gameHelper.domain(game, player.id, domainId);
            var resourceMatch = gameHelper.resourceMatch(resources, attachmentCard);

            if (attachmentCard.cost > 0) {
                if (domain.status != 'active' || attachmentCard.cost > resources.length || !resourceMatch) {
                    return false;
                }

                domain.status = 'drained';
                game = gameHelper.updateDomain(game, domain, player.id);
            }

            attachmentCard.attachableId = attachableId;

            return Promise.all([
                hand.remove(game.id, player.id, result.attachmentCard),
                attached.add(game.id, result.attachmentCard)
            ]).then(function () {
                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.commitCard = function (socket, data) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'commitCard')) {
            return false;
        }

        return played.get(game.id, player.id, data.cardId).then(function (card) {
            if (card.status != 'active') {
                return false;
            }

            return played.commit(game.id, player.id, data.storyId, data.cardId).then(function () {
                game.temp.storyCommits[data.storyId] = true;

                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.resolveStory = function (socket, data) {
    var storyId = data.storyId;

    if (!storyId) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'resolveStory')) {
            return false;
        }

        return Promise.props({
            storyCard: storyCard.get(game.id, storyId),
            playerCommittedCards: committed.all(game.id, player.id, storyId),
            opponentCommittedCards: committed.all(game.id, opponent.id, storyId)
        }).then(function (result) {
            if (!result.storyCard || (!result.playerCommittedCards && !result.opponentCommittedCards)) {
                return false;
            }

            player.actions = ['resolveTerrorStruggle'];
            game = gameHelper.updatePlayer(game, player);
            game.step = 'resolveTerrorStruggle';
            game.temp.storyStruggle = storyId;

            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};

exports.resolveIconStruggle = function (socket, data) {
    var struggle = data.struggle;

    if (!struggle) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'resolve' + struggle + 'Struggle')) {
            return false;
        }

        return Promise.props({
            storyCard: storyCard.get(game.id, game.temp.storyStruggle),
            playerCommittedCards: committed.all(game.id, player.id, game.temp.storyStruggle),
            opponentCommittedCards: committed.all(game.id, opponent.id, game.temp.storyStruggle)
        }).then(function (result) {
            var struggleResult = resolveStoryHelper.iconStruggle(struggle, result.playerCommittedCards, result.opponentCommittedCards);
            var nextStep;

            if (struggle == 'Terror') {
                nextStep = 'goInsane';

                if (struggleResult == 'player' && result.opponentCommittedCards.length) {
                    player.actions = [];
                    opponent.actions = ['goInsane'];
                    game.activePlayer = opponent.id;
                } else if (struggleResult == 'opponent' && result.playerCommittedCards.length) {
                    player.actions = ['goInsane'];
                } else {
                    nextStep = 'resolveCombatStruggle';
                    player.actions = ['resolveCombatStruggle'];
                }
            } else if (struggle == 'Combat') {
                nextStep = 'takeWound';

                if (struggleResult == 'player' && result.opponentCommittedCards.length) {
                    player.actions = [];
                    opponent.actions = ['takeWound'];
                    game.activePlayer = opponent.id;
                } else if (struggleResult == 'opponent' && result.playerCommittedCards.length) {
                    player.actions = ['takeWound'];
                } else {
                    nextStep = 'resolveArcaneStruggle';
                    player.actions = ['resolveArcaneStruggle'];
                }
            } else if (struggle == 'Arcane') {
                nextStep = 'goReady';

                if (struggleResult == 'player' && result.playerCommittedCards.length) {
                    player.actions = ['goReady'];
                } else if (struggleResult == 'opponent' && result.opponentCommittedCards.length) {
                    player.actions = [];
                    opponent.actions = ['goReady'];
                    game.activePlayer = opponent.id;
                } else {
                    nextStep = 'resolveInvestigationStruggle';
                    player.actions = ['resolveInvestigationStruggle'];
                }
            } else if (struggle == 'Investigation') {
                if (struggleResult == 'player') {
                    result.storyCard.successTokens['player' + player.id] += 1;
                } else if (struggleResult == 'opponent') {
                    result.storyCard.successTokens['player' + opponent.id] += 1;
                }

                storyCard.update(game.id, result.storyCard);

                nextStep = 'determineSuccess';
                player.actions = ['determineSuccess'];
            }

            game = gameHelper.updatePlayer(game, player);
            game = gameHelper.updatePlayer(game, opponent);
            game.step = nextStep;

            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};

exports.responseStruggle = function (socket, data) {
    var cardId = data.cardId;
    var resolveType = data.resolveType;

    if (!cardId || !resolveType) {
        return false;
    }

    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, resolveType)) {
            return false;
        }

        var storyId = game.temp.storyStruggle;

        return Promise.try(function () {
            return committed.get(game.id, player.id, storyId, cardId);
        }).then(function (card) {
            var nextStep;
            var promise;

            if (resolveType == 'goInsane') {
                nextStep = 'resolveCombatStruggle';

                promise = committed.goInsane(game.id, player.id, storyId, card.id);
            } else if (resolveType == 'takeWound') {
                nextStep = 'resolveArcaneStruggle';

                //TODO
                //take wound if survived

                promise = committed.discard(game.id, player.id, storyId, card.id);
            } else if (resolveType == 'goReady') {
                nextStep = 'resolveInvestigationStruggle';
                card.status = 'active';

                promise = committed.update(game.id, player.id, storyId, card);
            }

            if (game.turnPlayer == player.id) {
                player.actions = [nextStep];
                opponent.actions = [];
            } else {
                player.actions = [];
                opponent.actions = [nextStep];
            }

            game = gameHelper.updatePlayer(game, player);
            game = gameHelper.updatePlayer(game, opponent);
            game.activePlayer = game.turnPlayer;
            game.step = nextStep;

            return promise.then(function () {
                return updateAndBroadcastGameState(socket, game, player, opponent);
            });
        });
    });
};

exports.determineSuccess = function (socket) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'determineSuccess')) {
            return false;
        }

        return Promise.props({
            storyCard: storyCard.get(game.id, game.temp.storyStruggle),
            playerCommittedCards: committed.all(game.id, player.id, game.temp.storyStruggle),
            opponentCommittedCards: committed.all(game.id, opponent.id, game.temp.storyStruggle)
        }).then(function (result) {
            var successResult = resolveStoryHelper.determineSuccess(result.playerCommittedCards, result.opponentCommittedCards);

            if (successResult.success) {
                result.storyCard.successTokens['player' + player.id] += 1;
            }

            if (successResult.unchallenged) {
                result.storyCard.successTokens['player' + player.id] += 1;
            }

            storyCard.update(game.id, result.storyCard);

            committed.uncommitAll(game.id, player.id, result.storyCard.id);
            committed.uncommitAll(game.id, opponent.id, result.storyCard.id);

            delete game.temp.storyCommits[game.temp.storyStruggle];

            if (Object.keys(game.temp.storyCommits).length) {
                player.actions = ['resolveStory'];
                game.step = 'resolveStories';
            } else {
                player.actions = ['endTurn'];
                game.phase = 'endTurn';
                game.step = null;
            }

            game.temp.storyStruggle = 0;
            game = gameHelper.updatePlayer(game, player);

            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};

exports.endTurn = function (socket) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'endTurn')) {
            return false;
        }

        return Promise.try(function () {
            return endTurn(player.id, game);
        }).then(function (game) {
            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};

function endTurn(playerId, game) {
    var player = gameHelper.player(game, playerId);
    var opponent = gameHelper.opponent(game, playerId);

    if (game.turnPlayer != game.firstPlayer) {
        game.turn += 1;
    }

    game.phase = 'refresh';
    game.step = 'refreshAll';

    return played.all(game.id, opponent.id).then(function (cards) {
        cards.forEach(function (card) {
            if (card.status == 'insane') {
                game.step = 'restoreInsane';
            }
        });

        if (game.turnPlayer == player.id) {
            player.actions = [];
            opponent.actions = [game.step];

            game.turnPlayer = opponent.id;
        } else {
            player.actions = [game.step];
            opponent.actions = [];

            game.turnPlayer = player.id;
        }

        game.temp.storyCommits = {};
        game.activePlayer = game.turnPlayer;

        game = gameHelper.updatePlayer(game, player);
        game = gameHelper.updatePlayer(game, opponent);

        return game;
    });
}

exports.noAction = function (socket) {
    return Game.current(socket.userId).then(function (result) {
        var game = result;
        var player = gameHelper.player(game, socket.userId);
        var opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'noAction')) {
            return false;
        }

        var isEndTurn = false;
        player.actions = [];
        opponent.actions = ['takeAction', 'noAction'];

        if (player.id == game.turnPlayer) {
            if (game.phase == 'resource' && game.step == 'resourceCard') {
                game.step = 'takeAction';

                player.actions = ['resourceCard', 'noAction'];
                opponent.actions = [];
            } else if (game.phase == 'story' && game.step == 'playerCommit') {
                if (Object.keys(game.temp.storyCommits).length) {
                    game.step = 'beforeOpponentCommitAction';

                    player.actions = ['takeAction', 'noAction'];
                    opponent.actions = [];
                } else {
                    isEndTurn = true;
                }
            } else {
                game.activePlayer = opponent.id;
            }
        } else {
            var switchPlayer = true;

            if (game.phase == 'refresh') {
                game.phase = 'draw';
                game.step = 'drawCard';

                opponent.actions = ['drawCard'];
            } else if (game.phase == 'draw') {
                game.phase = 'resource';
                game.step = 'resourceCard';

                opponent.actions = ['resourceCard', 'noAction'];
            } else if (game.phase == 'resource') {
                game.phase = 'operations';
                game.step = 'takeAction';

                opponent.actions = ['playCard', 'noAction'];
            } else if (game.phase == 'operations') {
                if (game.turn == 1 && game.turnPlayer == game.firstPlayer) {
                    switchPlayer = false;
                    isEndTurn = true;
                } else {
                    game.phase = 'story';
                    game.step = 'beforePlayerCommitAction';
                }
            } else if (game.phase == 'story' && game.step == 'beforePlayerCommitAction') {
                game.step = 'playerCommit';

                opponent.actions = ['commitCard', 'noAction'];
            } else if (game.phase == 'story' && game.step == 'beforeOpponentCommitAction') {
                switchPlayer = false;
                game.step = 'opponentCommit';

                player.actions = ['commitCard', 'noAction'];
                opponent.actions = [];
            } else if (game.phase == 'story' && game.step == 'opponentCommit') {
                game.step = 'beforeResolveStoryAction';
            } else if (game.phase == 'story' && game.step == 'beforeResolveStoryAction') {
                game.step = 'resolveStories';

                opponent.actions = ['resolveStory'];
            } else if (game.phase == 'story' && game.step == 'takeAction') {
                game.step = 'endTurn';

                opponent.actions = ['endTurn'];
            }

            if (switchPlayer) {
                game.activePlayer = opponent.id;
            }
        }

        return Promise.try(function () {
            if (isEndTurn) {
                return endTurn(player.id, game);
            }
        }).then(function (_game) {
            if (_game) {
                game = _game;
            }

            game = gameHelper.updatePlayer(game, player);
            game = gameHelper.updatePlayer(game, opponent);

            return updateAndBroadcastGameState(socket, game, player, opponent);
        });
    });
};
