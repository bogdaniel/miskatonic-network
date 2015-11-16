$(function () {
    "use strict";

    socket.on('gameState', function (data) {
        //storyCards

        $('.row-story').empty().attr('data-section', 'storyCards');
        $.each(data.storyCards, function (index, card) {
            var cardWrapper = $.renderCard(card);
            var cardFrame = cardWrapper.children('.card-frame');
            var playerSuccessTokens = card.successTokens['player' + userId];
            var opponentSuccessTokens = card.successTokens['player' + data.gameInfo.opponentId];
            var header = $('<div class="header"><div class="successTokens">Tokens (<span class="count"></span>)</div></div>');
            var footer = $('<div class="footer"><div class="successTokens">Tokens (<span class="count"></span>)</div></div>');

            footer.find('.successTokens .count').text(playerSuccessTokens);
            header.find('.successTokens .count').text(opponentSuccessTokens);

            if (playerSuccessTokens > 0) {
                cardFrame.append(footer);
            }

            if (opponentSuccessTokens > 0) {
                cardFrame.append(header);
            }

            $('.row-story').append(cardWrapper);
        });

        //deck

        $('.row-player .draw-deck .header .cards .count').text(data.playerDeckCount);
        $('.row-opponent .draw-deck .header .cards .count').text(data.opponentDeckCount);

        //hand

        $('.row-opponent .hand-deck .header .cards .count').text(data.opponentHandCount);
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

        //domains

        renderAllDomains('player', data.playerDomains);
        renderAllDomains('opponent', data.opponentDomains);

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

        //discardPile

        renderDiscardPile('player', data.playerDiscardPile);
        renderDiscardPile('opponent', data.opponentDiscardPile);

        //attachedCards

        $.each(data.attachedCards, function (index, card) {
            $.renderAttachedCard(card);
        });

        console.log(data);

        handleGameInfo(data.gameInfo);
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

    function renderAllDomains(owner, data) {
        var container = $('.' + owner + '.row-domain');
        container.empty();

        $.each(data, function (index, domain) {
            var domainWrapper = $('<div>').addClass('card-wrapper card-domain domain domain-' + domain.id).attr('data-id', domain.id);
            var domainFrame = $('<div>').addClass('card-frame');
            var domainImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/back/domain' + domain.id + '.jpg');

            domainFrame.append(domainImage);
            domainWrapper.append(domainFrame);
            container.append(domainWrapper);
        });
    }

    function renderAllResourced(owner, data) {
        $.each(data, function (i, resourcedSectionData) {
            $.each(resourcedSectionData.resourcedCards, function (j, card) {
                $.resourceCard(owner, resourcedSectionData.domain, card);
            });
        });
    }

    function renderDiscardPile(owner, data) {
        var cardFrame = $('.row-' + owner + ' .discard-pile');
        var cardWrapper = cardFrame.closest('.card-wrapper');
        var count = 0;
        var image = 'back/card-back.jpg';
        var _class = 'card-back';
        var images = [];

        if (data.length) {
            count = data.length;
            image = data[data.length - 1].image;
            _class = 'card-active';
        }

        $.each(data, function (index, card) {
            images.push(card.image);
        });

        cardWrapper.removeClass('card-back').removeClass('card-active').addClass(_class);
        cardFrame.find('.header .cards .count').text(count);
        cardFrame.find('img').attr('src', '/images/cards/' + image);
        cardFrame.data('image', image);
        cardFrame.data('images', images);
    }

    function handleGameInfo(data) {
        var content = '';
        var firstPlayer = 'Opponent';
        var turnPlayer = '-';
        var activePlayer = 'Opponent';

        if (data.firstPlayer == userId) {
            firstPlayer = 'You';
        }

        if (data.phase != 'setup') {
            if (data.turnPlayer == userId) {
                turnPlayer = 'You';
            } else {
                turnPlayer = 'Opponent';
            }
        }

        if (data.activePlayer === 0) {
            activePlayer = 'Both';
        } else if (data.activePlayer == userId) {
            activePlayer = 'You';
        }

        content += 'Turn: ' + data.turn + '<br/>';
        content += 'First player: ' + firstPlayer + '<br/>';
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

            if ($.inArray('noAction', data.actions) != -1) {
                content += '<button id="no-action" type="button">NoAction</button>';
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

        if (data.storyStruggle !== 0) {
            var storyCard = $('.card-story .card-frame[data-id=' + data.storyStruggle + ']');
            var stories = $('.row-story .card-story .card-frame');
            var iconTarget = $('<div>').addClass('icon icon-target').append($('<img>').attr('src', '/images/target.jpg'));

            stories.removeClass('target');
            stories.find('.icon-target').remove();
            storyCard.addClass('target');
            storyCard.append(iconTarget);
        }

        gameInfo = data;
    }
});

var gameInfo;
