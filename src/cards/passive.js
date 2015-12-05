"use strict";

var Promise = require('bluebird');
var Const = require('../constant');
var Card = require('../database/redis/card');
var committed = require('../database/redis/committed');

exports.execute = function (game, data) {
    var promises = [];
    var playerPlayed = data.playerPlayed;
    var opponentPlayed = data.opponentPlayed;
    var playerDiscard = data.playerDiscard;
    var opponentDiscard = data.opponentDiscard;
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

    allCards.forEach(function (card) {
        card.cost = card.printedCost;
        card.skill = card.printedSkill;
        card.terror = card.printedTerror;
        card.combat = card.printedCombat;
        card.arcane = card.printedArcane;
        card.investigation = card.printedInvestigation;
        card.toughness = card.printedToughness;
        card.keyword = card.printedKeyword;
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
                    allCards.forEach(function (_card) {
                        if (_card.keyword.indexOf('heroic') > -1) {
                            _card.combat++;
                        }

                        if (_card.keyword.indexOf('villianous') > -1 && _card.terror > 0) {
                            _card.terror--;
                        }
                    });
                }
            }

            if (card.uid == 5) { //Professor Hermann Mulder
                let numberOfCharacters = 0;
                allCards.forEach(function (_card) {
                    if (_card.type == 'character') {
                        numberOfCharacters++;
                    }
                });

                if (numberOfCharacters > 5 && card.status != 'insane') {
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
                    allCards.forEach(function (_card) {
                        _card.toughness = 0;
                    });
                }
            }

            if (card.uid == 25) { //Anthropology Advisor
                playerHand.forEach(function (_card) {
                    if (_card.subtype && _card.subtype.indexOf('investigator') > -1 && _card.cost > 0) {
                        _card.cost--;
                    }
                });

                allCards.forEach(function (_card) {
                    if (_card.subtype && _card.subtype.indexOf('investigator') > -1) {
                        _card.investigation++;
                    }
                });
            }

            if (card.uid == 35) { //Atwood Science Hall
                allCards.forEach(function (_card) {
                    if (_card.ownerId == card.ownerId) {
                        _card.skill += _card.investigation;
                    }
                });
            }

            if (card.uid == 46) { //Shadow-spawned Hunting Horror
                if (card.position == 'committed') {
                    allCards.forEach(function (_card) {
                        if (_card.position == 'committed' && _card.investigation > 0) {
                            _card.investigation--;
                        }
                    });
                }
            }

            if (card.uid == 49) { //Ocean Crawlers
                card.skill += attachmentCards.length;
            }

            if (card.uid == 50) { //Lord of the Silver Twilight
                playerHand.forEach(function (_card) {
                    if (_card.faction == Const.cthulhu && _card.cost > 1) {
                        _card.cost--;
                    }
                });
            }

            if (card.uid == 55) { //Shadowed Reef
                allCards.forEach(function (_card) {
                    if (_card.subtype && _card.subtype.indexOf('deep-one') > -1) {
                        _card.terror++;
                    }
                });
            }

            if (card.uid == 73) { //Dutch Courage
                allCards.forEach(function (_card) {
                    if (_card.ownerId == card.ownerId && _card.type == 'character') {
                        _card.toughness++;
                    }
                });
            }

            if (card.uid == 83) { //Yellow Muse
                if (card.position == 'committed') {
                    allCards.forEach(function (_card) {
                        if (_card.position == 'committed' && _card.committedStory == card.committedStory && _card.keyword.indexOf('fast') > -1 && _card.id !== card.id) {
                            let i = _card.keyword.indexOf('fast');
                            _card.keyword.splice(i, 1);
                        }
                    });
                }
            }

            if (card.uid == 103) { //Son of Yeb
                allCards.forEach(function (_card) {
                    if (_card.ownerId == card.ownerId && _card.subtype && _card.subtype.indexOf('cultist') > -1) {
                        card.combat++;
                    }
                });
            }

            if (card.uid == 107) { //Spell-bound Shoggoth
                allCards.forEach(function (_card) {
                    if (_card.type == 'character' && _card.id != card.id && _card.skill > 0) {
                        _card.skill--;
                    }
                });
            }

            if (card.uid == 111) { //Disciple of the Gate
                allCards.forEach(function (_card) {
                    if (_card.faction == Const.yog_sothoth && _card.type == 'character') {
                        card.skill++;
                    }
                });
            }

            if (card.uid == 113) { //Forbidden Shrine
                allCards.forEach(function (_card) {
                    if (_card.ownerId == card.ownerId && _card.position == 'committed') {
                        _card.skill++;
                    }
                });
            }

            if (card.uid == 129) { //Mi-Go Scout
                allCards.forEach(function (_card) {
                    if (_card.subtype && _card.subtype.indexOf('mi-go') > -1 && _card.type == 'character') {
                        _card.investigation++;
                    }
                });
            }

            if (card.uid == 135) { //Altar of the Blessed
                allCards.forEach(function (_card) {
                    if (_card.ownerId == card.ownerId && _card.type == 'character') {
                        _card.skill++;
                    }
                });
            }

            if (card.uid == 142) { //Freelance Agent
                if (card.position == 'committed') {
                    let skill = card.skill;
                    allCards.forEach(function (_card) {
                        if (_card.position == 'committed' && _card.committedStory == card.committedStory && _card.ownerId != card.ownerId && _card.skill < skill) {
                            card.skill += 2;
                        }
                    });
                }
            }

            promises.push(Card.update(game.id, card));
        }
    )
    ;

    playerHand.forEach(function (card) {
        if (card.uid == 101) { //Yog-Sothoth
            playerDiscard.forEach(function (_card) {
                if (_card.subtype && _card.subtype.indexOf('spell') > -1 && card.cost > 1) {
                    card.cost--;
                }
            });
        }

        promises.push(Card.update(game.id, card));
    });

    return Promise.all(promises);
};
