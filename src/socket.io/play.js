"use strict";

var _ = require('underscore');
var gameHelper = require('../helpers/gameHelper');
var randomHelper = require('../helpers/randomHelper');
var resolveStoryHelper = require('../helpers/resolveStoryHelper');
var Promise = require('bluebird');
var Game = require('../database/redis/game');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');
var played = require('../database/redis/played');
var committed = require('../database/redis/committed');
var attached = require('../database/redis/attached');
var resourced = require('../database/redis/resourced');

exports.displayTable = function (socket) {
    var game;
    var player;
    var opponent;
    var data = {};

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        return Promise.props({
            storyDeckCount: storyDeck.count(game.id),
            storyCards: storyCard.all(game.id),
            playerHand: hand.all(game.id, player.id),
            attachedCards: attached.all(game.id),
            playerDeckCount: deck.count(game.id, player.id),
            opponentDeckCount: deck.count(game.id, opponent.id),
            playerPlayedCards: played.all(game.id, player.id),
            opponentPlayedCards: played.all(game.id, opponent.id),
            opponentHandCount: hand.count(game.id, opponent.id)
        }).then(function (result) {
            return Object.assign(data, result);
        }).then(function () {
            data.playerCommittedCards = [];
            data.opponentCommittedCards = [];

            return Promise.map(game.storyCards, function (storyCard) {
                return Promise.props({
                    playerCommittedCards: committed.all(game.id, player.id, storyCard.id),
                    opponentCommittedCards: committed.all(game.id, opponent.id, storyCard.id)
                }).then(function (result) {
                    data.playerCommittedCards.push({
                        storyCard: storyCard,
                        committedCards: result.playerCommittedCards
                    });

                    data.opponentCommittedCards.push({
                        storyCard: storyCard,
                        committedCards: result.opponentCommittedCards
                    });

                    return data;
                });
            });
        }).then(function () {
            data.playerResourcedCards = [];

            return Promise.map(player.domains, function (domain) {
                return Promise.props({
                    playerResourcedCards: resourced.all(game.id, player.id, domain.id)
                }).then(function (result) {
                    if (result.playerResourcedCards) {
                        data.playerResourcedCards.push({
                            domain: domain,
                            resourcedCards: result.playerResourcedCards
                        });
                    }

                    return data;
                });
            });
        }).then(function () {
            data.opponentResourcedCards = [];

            return Promise.map(opponent.domains, function (domain) {
                return Promise.props({
                    opponentResourcedCards: resourced.all(game.id, opponent.id, domain.id)
                }).then(function (result) {
                    if (result.opponentResourcedCards) {
                        data.opponentResourcedCards.push({
                            domain: domain,
                            resourcedCards: result.opponentResourcedCards
                        });
                    }

                    return data;
                });
            });
        });
    }).then(function () {
        data.gameInfo = gameHelper.gameInfo(game, player.id);

        socket.emit('gameData', data);
    });
};

exports.drawCard = function (socket) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'drawCard')) {
            return false;
        }

        return Promise.try(function () {
            return deck.draw(game.id, socket.userId);
        }).then(function (result) {
            if (result) {
                socket.emit('playerDrawnCard', result);
                socket.broadcast.emit('opponenetDrawnCard', result.count);
            } else {
                //TODO
                //player lost the game
            }
        }).then(function () {
            return hand.count(game.id, socket.userId);
        }).then(function (count) {
            socket.broadcast.emit('opponentHandCount', count);

            if (game.phase == 'setup' && count === 8) {
                player.actions = ['resourceCard'];
                game = gameHelper.updatePlayer(game, player);

                Game.update(game);

                socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            } else if (game.phase == 'draw') {
                game.temp.drawnCards += 1;

                if (game.temp.drawnCards == 2 || (game.turn == 1 && game.firstPlayer == player.id && game.temp.drawnCards == 1)) {
                    player.actions = ['resourceCard', 'endPhase'];
                    game = gameHelper.updatePlayer(game, player);
                    game.temp.drawnCards = 0;
                    game.phase = 'resource';
                }

                Game.update(game);

                socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
                socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
            }
        });
    });
};

exports.resourceCard = function (socket, data) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'resourceCard')) {
            return false;
        }

        Promise.try(function () {
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
                }).then(function (card) {
                    socket.broadcast.emit('opponentResourcedCard', {
                        domainId: data.domainId,
                        card: card
                    });
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
                                game.activePlayer = game.players[randomHelper.getRandomIntInclusive(0, 1)].id;
                                game.turnPlayer = game.activePlayer;
                                game.firstPlayer = game.activePlayer;
                                game.phase = 'refresh';

                                game.players.forEach(function (p, i) {
                                    if (p.id == game.activePlayer) {
                                        game.players[i].actions = ['restoreInsane', 'refreshAll'];
                                    } else {
                                        game.players[i].actions = [];
                                    }
                                });

                                Game.update(game);

                                socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
                                socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
                            }
                        });
                    } else if (game.phase == 'resource') {
                        player.actions = ['playCard', 'endPhase'];

                        game = gameHelper.updatePlayer(game, player);
                        game.phase = 'operations';

                        Game.update(game);

                        socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
                        socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
                    }
                });
            }
        });
    });
};

exports.restoreInsane = function (socket, data) {
    //
};

exports.refreshAll = function (socket) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'refreshAll')) {
            return false;
        }

        player.domains.forEach(function (domain) {
            domain.status = 'active';
        });
        player.actions = ['drawCard'];

        game = gameHelper.updatePlayer(game, player);
        game.phase = 'draw';

        Game.update(game);

        return Promise.try(function () {
            return played.all(game.id, player.id);
        }).then(function (cards) {
            if (cards.length) {
                cards.forEach(function (card) {
                    card.status = 'active';

                    played.update(game.id, player.id, card);
                });
            }
        }).then(function () {
            socket.emit('playerRefreshedAll');
            socket.broadcast.emit('opponentRefreshedAll');

            socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
        });
    });
};

exports.playCard = function (socket, data) {
    var cardId = data.cardId;
    var domainId = data.domainId;

    if (!cardId || !domainId) {
        return false;
    }

    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'playCard')) {
            return false;
        }

        return Promise.props({
            card: hand.get(game.id, player.id, cardId),
            resources: resourced.all(game.id, player.id, domainId)
        }).then(function (result) {
            var card = result.card;
            var resources = result.resources;
            var domain = gameHelper.domain(game, player.id, domainId);
            var resourceMatch = gameHelper.resourceMatch(resources, card);

            if (domain.status != 'active' || card.cost > resources.length || !resourceMatch) {
                return false;
            }

            domain.status = 'drained';
            game = gameHelper.updateDomain(game, domain, player.id);
            Game.update(game);

            return Promise.try(function () {
                return hand.play(game.id, player.id, cardId);
            }).then(function (card) {
                socket.broadcast.emit('opponentPlayedCard', card);
                socket.broadcast.emit('opponentDrainedDomain', domainId);
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

    if (!attachableId || !attachmentId || !domainId || !section) {
        return false;
    }

    if ((section == 'playerCommitted' || section == 'opponentCommitted') && !sectionId) {
        return false;
    }

    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

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

            if (domain.status != 'active' || attachmentCard.cost > resources.length || !resourceMatch) {
                return false;
            }

            attachmentCard.attachableId = attachableId;
            domain.status = 'drained';
            game = gameHelper.updateDomain(game, domain, player.id);
            Game.update(game);

            hand.remove(game.id, player.id, result.attachmentCard);
            attached.add(game.id, result.attachmentCard);

            socket.broadcast.emit('opponentAttachedCard', result.attachmentCard);
            socket.broadcast.emit('opponentDrainedDomain', domainId);
        });
    });
};

exports.endPhase = function (socket) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'endPhase')) {
            return false;
        }

        if (game.phase == 'resource') {
            game.phase = 'operations';
            game.step = null;

            player.actions = ['playCard', 'endPhase'];
        } else if (game.phase == 'operations') {
            if (game.turn == 1 && game.activePlayer == game.firstPlayer) {
                game = endTurn(socket, game);
            } else {
                game.phase = 'story';
                game.step = 'playerCommit';

                player.actions = ['commitCard', 'endPhase'];
            }
        } else if (game.phase == 'story' && game.step == 'playerCommit') {
            if (Object.keys(game.temp.storyCommits).length) {
                game.phase = 'story';
                game.step = 'opponentCommit';

                player.actions = [];
                opponent.actions = ['commitCard', 'endPhase'];

                game.activePlayer = opponent.id;
            } else {
                game = endTurn(socket, game);
            }
        } else if (game.phase == 'story' && game.step == 'opponentCommit') {
            game.phase = 'story';
            game.step = 'resolveStories';

            player.actions = [];
            opponent.actions = ['resolveStory'];

            game.activePlayer = opponent.id;
        } else if (game.phase == 'story' && game.step == 'resolveStories') {
            for (var storyId in game.temp.storyCommits) {
                if (game.temp.storyCommits.hasOwnProperty(storyId)) {
                    committed.removeAll(game.id, player.id, storyId);
                    committed.removeAll(game.id, opponent.id, storyId);
                }
            }

            game = endTurn(socket, game);
        }

        game = gameHelper.updatePlayer(game, player);
        game = gameHelper.updatePlayer(game, opponent);

        Game.update(game);

        socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
        socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
    });
};

exports.commitCard = function (socket, data) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'commitCard')) {
            return false;
        }

        return Promise.try(function () {
            return played.get(game.id, player.id, data.cardId);
        }).then(function (card) {
            if (card.status != 'active') {
                return false;
            }

            return Promise.try(function () {
                return played.commit(game.id, player.id, data.storyId, data.cardId);
            }).then(function (card) {
                game.temp.storyCommits[data.storyId] = true;

                Game.update(game);

                socket.broadcast.emit('opponentCommittedCard', {
                    storyId: data.storyId,
                    card: card
                });
            });
        });
    });
};

exports.resolveStory = function (socket, data) {
    var storyId = data.storyId;

    if (!storyId) {
        return false;
    }

    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

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

            Game.update(game);

            socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
        });
    });
};

exports.resolveIconStruggle = function (socket, data) {
    var struggle = data.struggle;

    if (!struggle) {
        return false;
    }

    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

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

                if (struggleResult == 'player' && result.opponentCommittedCards.length) {
                    player.actions = [];
                    opponent.actions = ['goReady'];
                    game.activePlayer = opponent.id;
                } else if (struggleResult == 'opponent' && result.playerCommittedCards.length) {
                    player.actions = ['goReady'];
                } else {
                    nextStep = 'resolveInvestigationStruggle';
                    player.actions = ['resolveInvestigationStruggle'];
                }
            } else if (struggle == 'Investigation') {
                if (struggleResult == 'player') {
                    //TODO
                    //add success tokens
                } else if (struggleResult == 'opponent') {
                    //TODO
                    //add success tokens
                }

                nextStep = 'determineSuccess';
                player.actions = ['determineSuccess'];
            }

            game = gameHelper.updatePlayer(game, player);
            game = gameHelper.updatePlayer(game, opponent);
            game.step = nextStep;

            Game.update(game);

            socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
        });
    });
};

exports.responseStruggle = function (socket, data) {
    var cardId = data.cardId;
    var resolveType = data.resolveType;

    if (!cardId || !resolveType) {
        return false;
    }

    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, resolveType)) {
            return false;
        }

        var storyId = game.temp.storyStruggle;

        return Promise.try(function () {
            return committed.get(game.id, player.id, storyId, cardId);
        }).then(function (card) {
            var struggle;
            var nextStep;

            if (resolveType == 'goInsane') {
                nextStep = 'resolveCombatStruggle';
                struggle = 'terror';
                card.status = 'insane';

                committed.update(game.id, player.id, storyId, card);
            } else if (resolveType == 'takeWound') {
                nextStep = 'resolveArcaneStruggle';
                struggle = 'combat';

                //TODO
                //remove if died

                committed.remove(game.id, player.id, storyId, card);
            } else if (resolveType == 'goReady') {
                nextStep = 'resolveInvestigationStruggle';
                struggle = 'arcane';
                card.status = 'active';

                committed.update(game.id, player.id, storyId, card);
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
            Game.update(game);

            socket.emit('iconStruggleResolved', {
                struggle: struggle,
                card: card
            });

            socket.broadcast.emit('iconStruggleResolved', {
                struggle: struggle,
                card: card
            });

            socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
        });
    });
};

exports.determineSuccess = function (socket) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'determineSuccess')) {
            return false;
        }

        return Promise.props({
            storyCard: storyCard.get(game.id, game.temp.storyStruggle),
            playerCommittedCards: committed.all(game.id, player.id, game.temp.storyStruggle),
            opponentCommittedCards: committed.all(game.id, opponent.id, game.temp.storyStruggle)
        }).then(function (result) {
            var successResult = resolveStoryHelper.determineSuccess(result.playerCommittedCards, result.opponentCommittedCards);

            for (var storyId in game.temp.storyCommits) {
                if (game.temp.storyCommits.hasOwnProperty(storyId)) {
                    committed.removeAll(game.id, player.id, storyId);
                    committed.removeAll(game.id, opponent.id, storyId);
                }
            }

            console.log(successResult);
            console.log(game.temp.storyCommits);
            console.log(game.temp.storyStruggle);
            delete game.temp.storyCommits[game.temp.storyStruggle];

            if (Object.keys(game.temp.storyCommits).length) {
                //TODO
                //fall back to resolveStory if there is any left
            } else {
                player.actions = ['endTurn'];
                game = gameHelper.updatePlayer(game, player);
                game.phase = 'endTurn';
                game.step = null;
                game.temp.storyStruggle = 0;
            }

            Game.update(game);

            socket.emit('successDetermined', successResult);
            socket.broadcast.emit('successDetermined', successResult);

            socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
            socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
        });
    });
};

exports.endTurn = function (socket) {
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

        if (!gameHelper.isAllowed(player, 'endTurn')) {
            return false;
        }

        game = endTurn(socket, game);
        Game.update(game);

        socket.emit('gameInfo', gameHelper.gameInfo(game, player.id));
        socket.broadcast.emit('gameInfo', gameHelper.gameInfo(game, opponent.id));
    });
};

function endTurn(socket, game) {
    var player = gameHelper.player(game, socket.userId);
    var opponent = gameHelper.opponent(game, socket.userId);

    if (game.activePlayer != game.firstPlayer) {
        game.turn += 1;
    }

    if (game.activePlayer == player.id) {
        player.actions = [];
        opponent.actions = ['restoreInsane', 'refreshAll'];

        game.activePlayer = opponent.id;
    } else {
        player.actions = ['restoreInsane', 'refreshAll'];
        opponent.actions = [];

        game.activePlayer = player.id;
    }

    game.temp.storyCommits = {};
    game.turnPlayer = game.activePlayer;
    game.phase = 'refresh';
    game.step = null;
    game = gameHelper.updatePlayer(game, player);
    game = gameHelper.updatePlayer(game, opponent);

    socket.emit('turnEnded');
    socket.broadcast.emit('turnEnded');

    return game;
}
