"use strict";

var _ = require('underscore');
var gameHelper = require('../helpers/gameHelper');
var randomHelper = require('../helpers/randomHelper');
var Promise = require('bluebird');
var Game = require('../database/redis/game');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');
var played = require('../database/redis/played');
var committed = require('../database/redis/committed');
var resourced = require('../database/redis/resourced');

exports.displayTable = function (socket) {
    var game;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;

        return Promise.all([
            storyDeck.count(game.id),
            storyCard.all(game.id)
        ]);
    }).then(function (result) {
        socket.emit('storyDeckCount', result[0]);
        socket.emit('activeStoryCards', result[1]);
    }).then(function () {
        game.players.forEach(function (player) {
            deck.count(game.id, player.id).then(function (count) {
                if (player.id === socket.userId) {
                    socket.emit('playerDeckCount', count);
                } else {
                    socket.emit('opponentDeckCount', count);
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    game.storyCards.forEach(function (storyCard) {
                        committed.all(game.id, player.id, storyCard.id).then(function (cards) {
                            socket.emit('playerCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                } else {
                    game.storyCards.forEach(function (storyCard) {
                        committed.all(game.id, player.id, storyCard.id).then(function (cards) {
                            socket.emit('opponentCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    player.domains.forEach(function (domain) {
                        resourced.all(game.id, player.id, domain.id).then(function (cards) {
                            socket.emit('playerResourcedCards', {
                                domain: domain,
                                cards: cards
                            });
                        });
                    });
                } else {
                    player.domains.forEach(function (domain) {
                        resourced.all(game.id, player.id, domain.id).then(function (cards) {
                            socket.emit('opponentResourcedCards', {
                                domain: domain,
                                cards: cards
                            });
                        });
                    });
                }
            }).then(function () {
                if (player.id !== socket.userId) {
                    hand.count(game.id, player.id).then(function (count) {
                        socket.emit('opponentHandCount', count);
                    });
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    played.all(game.id, player.id).then(function (cards) {
                        socket.emit('playerPlayedCards', cards);
                    });
                } else {
                    played.all(game.id, player.id).then(function (cards) {
                        socket.emit('opponentPlayedCards', cards);
                    });
                }
            });
        });
    }).then(function () {
        hand.all(game.id, socket.userId).then(function (cards) {
            socket.emit('playerHand', cards);
        });
    }).then(function () {
        socket.emit('gameInfo', gameHelper.gameInfo(game, socket.userId));
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
                    player.actions = ['resourceCard'];
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
                                game.firstPlayer = game.activePlayer;
                                game.phase = 'refresh';

                                game.players.forEach(function (p, i) {
                                    game.players[i].actions = ['restoreInsane', 'refreshAll'];
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
            var resourceMath = gameHelper.resourceMatch(resources, card);

            if (domain.status != 'active' || card.cost > resources.length || !resourceMath) {
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

exports.endPhase = function (socket) {
    //
};

exports.commitCard = function (socket, data) {
    played.commit(socket.gameId, socket.userId, data.storyId, data.cardId).then(function (card) {
        socket.broadcast.emit('opponentCommittedCard', {
            storyId: data.storyId,
            card: card
        });
    });
};
