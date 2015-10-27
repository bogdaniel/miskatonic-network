"use strict";

var _ = require('underscore');
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
    var game = socket.game;

    storyDeck.count(game.id).then(function (count) {
        socket.emit('storyDeckCount', count);
    }).then(function () {
        storyCard.all(game.id).then(function (cards) {
            socket.emit('activeStoryCards', cards);
        });
    }).then(function () {
        var player = _.findWhere(game.players, {id: socket.userId});

        socket.emit('gameActions', player.actions);
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
                        committed.all(game.id, player.id, storyCard.cid).then(function (cards) {
                            socket.emit('playerCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                } else {
                    game.storyCards.forEach(function (storyCard) {
                        committed.all(game.id, player.id, storyCard.cid).then(function (cards) {
                            socket.emit('opponentCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    player.resources.forEach(function (resourceId) {
                        resourced.all(game.id, player.id, resourceId).then(function (cards) {
                            socket.emit('playerResourcedCards', {
                                resourceId: resourceId,
                                cards: cards
                            });
                        });
                    });
                } else {
                    player.resources.forEach(function (resourceId) {
                        resourced.all(game.id, player.id, resourceId).then(function (cards) {
                            socket.emit('opponentResourcedCards', {
                                resourceId: resourceId,
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
    });
};

exports.drawCard = function (socket) {
    var game = socket.game;
    var player = _.findWhere(game.players, {id: socket.userId});
    var data = {};

    if (_.indexOf(player.actions, 'drawCard') == -1) {
        return false;
    }

    return Promise.try(function () {
        return deck.draw(game.id, socket.userId);
    }).then(function (result) {
        socket.emit('playerDrawnCard', result);
        socket.broadcast.emit('opponenetDrawnCard', result.count);

        data.card = result.card;
        data.count = result.count;
    }).then(function () {
        return hand.count(game.id, socket.userId)
    }).then(function (count) {
        socket.broadcast.emit('opponentHandCount', count);

        if (game.phase == 'setup' && count === 8) {
            player.actions = ['resourceCard'];

            game.players.forEach(function (p, i) {
                if (p.id === player.id) {
                    game.players[i] = player;
                }
            });

            Game.update(game);

            socket.emit('gameActions', player.actions);
        }
    });
};

exports.playCard = function (socket, cardId) {
    var game = socket.game;

    hand.play(game.id, socket.userId, cardId).then(function (card) {
        socket.broadcast.emit('opponentPlayedCard', card);
    });
};

exports.commitCard = function (socket, data) {
    var game = socket.game;

    played.commit(game.id, socket.userId, data.storyId, data.cardId).then(function (card) {
        socket.broadcast.emit('opponentCommittedCard', {
            storyId: data.storyId,
            card: card
        });
    });
};

exports.resourceCard = function (socket, data) {
    var game = socket.game;
    var player = _.findWhere(game.players, {id: socket.userId});

    if (_.indexOf(player.actions, 'resourceCard') == -1) {
        return false;
    }

    Promise.try(function () {
        if (game.phase == 'setup') {
            return Promise.try(function () {
                return resourced.count(game.id, player.id, data.resourceId);
            });
        }
    }).then(function (count) {
        if (count == 1) {
            return false;
        } else {
            return Promise.try(function () {
                return hand.resource(game.id, player.id, data.resourceId, data.cardId);
            }).then(function (card) {
                socket.broadcast.emit('opponentResourcedCard', {
                    resourceId: data.resourceId,
                    card: card
                });
            }).then(function () {
                if (game.phase == 'setup') {
                    return Promise.try(function () {
                        return Game.opponentId(player.id);
                    }).then(function (opponentId) {
                        return Promise.props({
                            playerCount: resourced.countAll(game.id, player.id),
                            opponentCount: resourced.countAll(game.id, opponentId)
                        });
                    }).then(function (count) {
                        if (count.playerCount == 3) {
                            player.actions = ['none'];

                            game.players.forEach(function (p, i) {
                                if (p.id === player.id) {
                                    game.players[i] = player;
                                }
                            });

                            Game.update(game);

                            socket.emit('gameActions', player.actions);
                        }

                        if (count.playerCount == 3 && count.opponentCount == 3) {
                            game.players.forEach(function (p, i) {
                                game.players[i].actions = ['drawCard'];
                            });

                            game.turn = 1;
                            game.activePlayer = game.host;
                            game.phase = 'draw';

                            Game.update(game);

                            if (game.activePlayer == player.id) {
                                socket.emit('gameActions', player.actions);
                            } else {
                                socket.broadcast.emit('gameActions', player.actions);
                            }
                        }
                    })
                }
            });
        }
    });
};
