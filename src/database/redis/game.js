"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var gameHelper = require('../../helpers/gameHelper');
var storyCard = require('./storyCard');
var storyDeck = require('./storyDeck');
var deck = require('./deck');
var hand = require('./hand');
var played = require('./played');
var discard = require('./discard');
var committed = require('./committed');
var attached = require('./attached');
var resourced = require('./resourced');

Promise.promisifyAll(redis);

exports.all = function () {
    return redis.zrevrangeAsync('games', 0, -1).then(function (games) {
        if (!games.length) {
            return false;
        }

        games.forEach(function (game, index) {
            games[index] = JSON.parse(game);
        });

        return games;
    });
};

exports.get = function (gameId) {
    return redis.zrangebyscoreAsync('games', gameId, gameId).then(function (game) {
        if (!game.length) {
            return false;
        }

        return JSON.parse(game);
    });
};

exports.current = function (playerId) {
    return redis.getAsync('current:' + playerId).then(function (game) {
        if (!game) {
            return false;
        }

        return JSON.parse(game);
    });
};

exports.create = function (game, playerId) {
    redis.set('current:' + playerId, JSON.stringify(game));
    redis.zadd('games', game.id, JSON.stringify(game));
};

exports.update = function (game) {
    redis.zremrangebyscore('games', game.id, game.id);
    redis.zadd('games', game.id, JSON.stringify(game));

    game.players.forEach(function (player) {
        redis.del('current:' + player.id);
        redis.set('current:' + player.id, JSON.stringify(game));
    });
};

exports.delete = function (game) {
    redis.del('attachedCards:' + game.id);
    redis.del('storyDeck:' + game.id);
    redis.del('storyCards:' + game.id);
    redis.zremrangebyscore('games', game.id, game.id);
};

exports.leave = function (gameId, playerId) {
    this.get(gameId).then(function (game) {
        redis.del('current:' + playerId);
        redis.del('deck:' + gameId + ':' + playerId);
        redis.del('hand:' + gameId + ':' + playerId);
        redis.del('discardPile:' + gameId + ':' + playerId);
        redis.del('playedCards:' + gameId + ':' + playerId);

        if (game.storyCards) {
            game.storyCards.forEach(function (storyCard) {
                redis.del('committedCards:' + gameId + ':' + playerId + ':' + storyCard.id);
            });
        }

        game.players.forEach(function (player) {
            player.domains.forEach(function (domainId) {
                redis.del('resourcedCards:' + gameId + ':' + playerId + ':' + domainId);
            });
        });
    });
};

exports.getState = function (playerId) {
    var self = this;
    var game;
    var player;
    var opponent;
    var data = {};

    return Promise.try(function () {
        return self.current(playerId);
    }).then(function (result) {
        game = result;
        player = gameHelper.player(game, playerId);
        opponent = gameHelper.opponent(game, playerId);

        return Promise.props({
            storyDeckCount: storyDeck.count(game.id),
            storyCards: storyCard.all(game.id),
            playerHand: hand.all(game.id, player.id),
            attachedCards: attached.all(game.id),
            playerDeckCount: deck.count(game.id, player.id),
            opponentDeckCount: deck.count(game.id, opponent.id),
            playerPlayedCards: played.all(game.id, player.id),
            opponentPlayedCards: played.all(game.id, opponent.id),
            playerDiscardPile: discard.all(game.id, player.id),
            opponentDiscardPile: discard.all(game.id, opponent.id),
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
            data.playerDomains = player.domains;
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
            data.opponentDomains = opponent.domains;
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

        return data;
    });
};
