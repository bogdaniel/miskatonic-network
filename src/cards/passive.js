"use strict";

var Promise = require('bluebird');
var Const = require('../constant');
var Card = require('../database/redis/card');
var committed = require('../database/redis/committed');

exports.execute = function (game, data) {
    var promises = [];
    var playerPlayed = data.playerPlayed;
    var opponentPlayed = data.opponentPlayed;
    var playerCommitted1 = data.playerCommitted1;
    var opponentCommitted1 = data.opponentCommitted1;
    var playerCommitted2 = data.playerCommitted2;
    var opponentCommitted2 = data.opponentCommitted2;
    var playerCommitted3 = data.playerCommitted3;
    var opponentCommitted3 = data.opponentCommitted3;
    var playerCommitted4 = data.playerCommitted4;
    var opponentCommitted4 = data.opponentCommitted4;
    var playerCommitted5 = data.playerCommitted5;
    var opponentCommitted5 = data.opponentCommitted5;
    var attachmentCards = data.attachmentCards;
    var playerHand = data.playerHand;

    var allCards = playerPlayed.concat(
        opponentPlayed, playerCommitted1, opponentCommitted1, playerCommitted2, opponentCommitted2,
        playerCommitted3, opponentCommitted3, playerCommitted4, opponentCommitted4, playerCommitted5,
        opponentCommitted5
    );

    var numberOfCharacterCards = 0;

    allCards.forEach(function (card) {
        card.cost = card.printedCost;
        card.skill = card.printedSkill;
        card.terror = card.printedTerror;
        card.combat = card.printedCombat;
        card.arcane = card.printedArcane;
        card.investigation = card.printedInvestigation;
        card.toughness = card.printedToughness;
        card.keyword = card.printedKeyword;

        if (card.type == 'character') {
            numberOfCharacterCards++;
        }
    });

    playerHand.forEach(function (card) {
        card.cost = card.printedCost;
        card.skill = card.printedSkill;
        card.terror = card.printedTerror;
        card.combat = card.printedCombat;
        card.arcane = card.printedArcane;
        card.investigation = card.printedInvestigation;
        card.toughness = card.printedToughness;
        card.keyword = card.printedKeyword;
    });

    allCards.forEach(function (card) {
        if (card.uid == 2) { //Kirby O'Donnell
            if (card.position == 'committed') {
                allCards.forEach(function (card) {
                    if (card.keyword.indexOf('heroic') > -1) {
                        card.combat++;
                    }

                    if (card.keyword.indexOf('villianous') > -1 && card.terror > 0) {
                        card.terror--;
                    }
                });
            }
        }

        if (card.uid == 5) { //Professor Hermann Mulder
            if (numberOfCharacterCards > 5 && card.status != 'insane') {
                if (card.position == 'played') {
                    card.status = 'insane';
                } else if (card.position == 'committed') {
                    promises.push(committed.goInsane(game.id, card.ownerId, card.committedStory, card.id));
                }
            }
        }

        if (card.uid == 11) { //Peeler
            if (attachmentCards.length > 0) {
                card.keyword.push('willpower');
            }
        }

        if (card.uid == 23) { //Steve Clarney
            if (card.position == 'committed') {
                allCards.forEach(function (card) {
                    card.toughness = 0;
                });
            }
        }

        if (card.uid == 25) { //Anthropology Advisor
            playerHand.forEach(function (card) {
                if (card.subtype.indexOf('investigator') > -1 && card.cost > 0) {
                    card.cost--;
                }
            });

            allCards.forEach(function (card) {
                if (card.subtype.indexOf('investigator') > -1) {
                    card.investigation++;
                }
            });
        }

        if (card.uid == 35) { //Atwood Science Hall
            let ownerId = card.ownerId;
            allCards.forEach(function (card) {
                if (card.ownerId == ownerId) {
                    card.skill += card.investigation;
                }
            });
        }

        if (card.uid == 46) { //Shadow-spawned Hunting Horror
            if (card.position == 'committed') {
                allCards.forEach(function (card) {
                    if (card.position == 'committed' && card.investigation > 0) {
                        card.investigation--;
                    }
                });
            }
        }

        if (card.uid == 49) { //Ocean Crawlers
            card.skill += attachmentCards.length;
        }

        if (card.uid == 50) { //Lord of the Silver Twilight
            playerHand.forEach(function (card) {
                if (card.faction == Const.cthulhu && card.cost > 2) {
                    card.cost--;
                }
            });
        }

        if (card.uid == 55) { //Shadowed Reef
            allCards.forEach(function (card) {
                if (card.subtype.indexOf('deep-one') > -1) {
                    card.terror++;
                }
            });
        }

        if (card.uid == 73) { //Dutch Courage
            let ownerId = card.ownerId;
            allCards.forEach(function (card) {
                if (card.ownerId == ownerId && card.type == 'character') {
                    card.toughness++;
                }
            });
        }

        if (card.uid == 83) { //Yellow Muse
            if (card.position == 'committed') {
                let cardId = card.id;
                let storyId = card.committedStory;
                allCards.forEach(function (card) {
                    if (card.position == 'committed' && card.committedStory == storyId && card.keyword.indexOf('fast') > -1 && card.id !== cardId) {
                        let index = card.keyword.indexOf('fast');
                        card.keyword.splice(index, 1);
                    }
                });
            }
        }

        if (card.uid == 135) { //Altar of the Blessed
            let ownerId = card.ownerId;
            allCards.forEach(function (card) {
                if (card.ownerId == ownerId && card.type == 'character') {
                    console.log(card.title);
                    card.skill++;
                }
            });
        }

        promises.push(Card.update(game.id, card));
    });

    playerHand.forEach(function (card) {
        promises.push(Card.update(game.id, card));
    });

    return Promise.all(promises);
};
