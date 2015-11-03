$(function () {
    "use strict";

    socket.on('gameData', function (data) {
        console.log(data);

        handleGameInfo(data.gameInfo);

        //storyCards

        $('.row-story').empty().attr('data-section', 'storyCards');
        $.each(data.storyCards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.row-story').append(cardFrame);
        });

        //deck

        $('.row-opponent .draw-deck .count').text(data.playerDeckCount);
        $('.row-player .draw-deck .count').text(data.opponentDeckCount);

        //hand

        $('.row-opponent .hand-deck .count').text(data.opponentHandCount);
        $('.row-hand').empty().setSortable();
        $.each(data.playerHand, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.row-hand').append(cardFrame);
        });

        //playedCards

        $('.player.row-played').setSortable().setDroppable().attr('data-section', 'playerPlayed');
        $('.opponent.row-played').attr('data-section', 'opponentPlayed');
        renderAllPlayed('.player.row-played', data.playerPlayedCards);
        renderAllPlayed('.opponent.row-played', data.opponentPlayedCards);

        //committedCards

        renderAllCommitted('player', data.playerCommittedCards);
        renderAllCommitted('opponent', data.opponentCommittedCards);
        $('.player.row-committed .col-committed').setSortable().droppable({
            greedy: true,
            accept: '.player.row-played .card-wrapper',
            drop: $.commitCard,
            over: $.droppableOver,
            out: $.droppableOut
        });

        //resourcedCards

        renderAllResourced('player', data.playerResourcedCards);
        renderAllResourced('opponent', data.opponentResourcedCards);
        $('.player.row-domain .domain').droppable({
            greedy: true,
            accept: '.row-hand .card-wrapper',
            drop: $.playerResourceCard,
            over: function (event, ui) {
                var domainContainer = $(event.target);
                var resourceContainer = domainContainer.children('.card-resources');
                var highlight = $('<div>').addClass('card-frame').addClass('card-highlight');

                if (!$.isAllowed('resourceCard')) {
                    return false;
                }

                if (!resourceContainer.length) {
                    resourceContainer = $('<div>').addClass('card-resources').prependTo(domainContainer);
                }

                resourceContainer.prepend(highlight);
            },
            out: $.droppableOut
        });

        //attachedCards

        $.each(data.attachedCards, function (index, card) {
            $.renderAttachedCard(card);
        });
    });

    function renderAllPlayed(section, cards) {
        var container = $(section);

        container.empty();

        $.each(cards, function (index, card) {
            var cardWrapper = $.renderCard(card).setAttachable();
            container.append(cardWrapper);
        });
    }

    function renderAllCommitted(owner, data) {
        $('.' + owner + '.row-committed .col-committed').remove();

        $.each(data, function (i, committedSectionData) {
            var storyCard = committedSectionData.storyCard;
            var container = $('<div>').addClass('col-committed').addClass('committed-story-' + storyCard.id).attr('data-id', storyCard.id);

            $.each(committedSectionData.committedCards, function (j, card) {
                container.append($.renderCard(card));
            });

            $('.' + owner + '.row-committed').append(container).attr('data-section', owner + 'Committed');
        });
    }

    function renderAllResourced(owner, data) {
        $('.' + owner + '.row-domain .domain .card-resources').remove();

        $.each(data, function (i, resourcedSectionData) {
            $.each(resourcedSectionData.resourcedCards, function (j, card) {
                $.resourceCard(owner, resourcedSectionData.domain, card);
            });
        });
    }

    function handleGameInfo(data) {
        var content = '';
        var activePlayer = 'Opponent';
        var turnPlayer = '-';

        if (data.activePlayer === 0) {
            activePlayer = 'Both';
        } else if (data.activePlayer == userId) {
            activePlayer = 'You';
        }

        if (data.phase != 'setup') {
            if (data.turnPlayer == userId) {
                turnPlayer = 'You';
            } else {
                turnPlayer = 'Opponent';
            }
        }

        content += 'Turn: ' + data.turn + '<br/>';
        content += 'Turn player: ' + turnPlayer + '<br/>';
        content += 'Active player: ' + activePlayer + '<br/>';
        content += 'Phase: ' + data.phase + '<br/>';
        content += 'Step: ' + data.step + '<br/>';
        content += 'Actions: ' + data.actions.join(', ');

        if (data.activePlayer == userId) {
            content += '<hr/>';

            if ($.inArray('restoreInsane', data.actions) != -1) {
                content += '<button id="restore-insane" type="button">RestoreInsane</button>';
            }

            if ($.inArray('refreshAll', data.actions) != -1) {
                content += '<button id="refresh-all" type="button">RefreshAll</button>';
            }

            if ($.inArray('endPhase', data.actions) != -1) {
                content += '<button id="end-phase" type="button">EndPhase</button>';
            }

            if ($.inArray('resolveStory', data.actions) != -1) {
                content += '<button id="resolve-story" type="button">ResolveStory</button>';
            }

            if ($.inArray('resolveTerrorStruggle', data.actions) != -1) {
                content += '<button id="resolve-struggle" data-type="Terror" type="button">ResolveTerrorStruggle</button>';
            }

            if ($.inArray('goInsane', data.actions) != -1) {
                content += '<button id="response-struggle" data-type="goInsane" type="button">GoInsane</button>';
            }

            if ($.inArray('resolveCombatStruggle', data.actions) != -1) {
                content += '<button id="resolve-struggle" data-type="Combat" type="button">ResolveCombatStruggle</button>';
            }

            if ($.inArray('takeWound', data.actions) != -1) {
                content += '<button id="response-struggle" data-type="takeWound" type="button">TakeWound</button>';
            }

            if ($.inArray('resolveArcaneStruggle', data.actions) != -1) {
                content += '<button id="resolve-struggle" data-type="Arcane" type="button">ResolveArcaneStruggle</button>';
            }

            if ($.inArray('goReady', data.actions) != -1) {
                content += '<button id="response-struggle" data-type="goReady" type="button">GoReady</button>';
            }

            if ($.inArray('resolveInvestigationStruggle', data.actions) != -1) {
                content += '<button id="resolve-struggle" data-type="Investigation" type="button">ResolveInvestigationStruggle</button>';
            }

            if ($.inArray('determineSuccess', data.actions) != -1) {
                content += '<button id="determine-success" type="button">DetermineSuccess</button>';
            }

            if ($.inArray('endTurn', data.actions) != -1) {
                content += '<button id="end-turn" type="button">EndTurn</button>';
            }
        }

        $('.control').html(content);

        gameInfo = data;
    }

    socket.on('gameInfo', function (data) {
        handleGameInfo(data);
    });
});

var gameInfo;
