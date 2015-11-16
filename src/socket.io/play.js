"use strict";

var _ = require('underscore');
var gameHelper = require('../helpers/gameHelper');
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
    return Promise.try(function () {
        return Game.getState(socket.userId);
    }).then(function (data) {
        socket.emit('gameState', data);
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

            Game.update(game);

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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

                                Game.update(game);
                            }

                            Game.getState(player.id).then(function (data) {
                                socket.emit('gameState', data);
                            });
                            Game.getState(opponent.id).then(function (data) {
                                socket.broadcast.emit('gameState', data);
                            });
                        });
                    } else if (game.phase == 'resource') {
                        player.actions = ['takeAction', 'noAction'];

                        game = gameHelper.updatePlayer(game, player);
                        game.step = 'takeAction';

                        Game.update(game);

                        Game.getState(player.id).then(function (data) {
                            socket.emit('gameState', data);
                        });
                        Game.getState(opponent.id).then(function (data) {
                            socket.broadcast.emit('gameState', data);
                        });
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

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
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
            Game.update(game);

            card.status = 'exhausted';

            return played.update(game.id, player.id, card);
        }).then(function () {
            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
        });
    });
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
        player.actions = ['takeAction', 'noAction'];

        game = gameHelper.updatePlayer(game, player);
        game.step = 'takeAction';

        return Promise.try(function () {
            return played.all(game.id, player.id);
        }).then(function (cards) {
            if (cards.length) {
                cards.forEach(function (card) {
                    if (game.temp.insaneRestored != card.id) {
                        card.status = 'active';

                        played.update(game.id, player.id, card);
                    }
                });
            }

            game.temp.insaneRestored = 0;
            Game.update(game);

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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
            }).then(function () {
                Game.getState(player.id).then(function (data) {
                    socket.emit('gameState', data);
                });
                Game.getState(opponent.id).then(function (data) {
                    socket.broadcast.emit('gameState', data);
                });
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
        }).then(function () {
            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
        });
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

                Game.getState(player.id).then(function (data) {
                    socket.emit('gameState', data);
                });
                Game.getState(opponent.id).then(function (data) {
                    socket.broadcast.emit('gameState', data);
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

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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

            Game.update(game);

            return promise;
        }).then(function () {
            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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
                    committed.uncommitAll(game.id, player.id, storyId);
                    committed.uncommitAll(game.id, opponent.id, storyId);
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

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
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

        return endTurn(player.id, game);
    }).then(function (game) {
        Game.update(game);

        Game.getState(player.id).then(function (data) {
            socket.emit('gameState', data);
        });
        Game.getState(opponent.id).then(function (data) {
            socket.broadcast.emit('gameState', data);
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
    var game;
    var player;
    var opponent;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, socket.userId);
        opponent = gameHelper.opponent(game, socket.userId);

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
            Game.update(game);

            Game.getState(player.id).then(function (data) {
                socket.emit('gameState', data);
            });
            Game.getState(opponent.id).then(function (data) {
                socket.broadcast.emit('gameState', data);
            });
        });
    });
};
