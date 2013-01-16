(function($){
    if($.vote_panel){return}
    /* this is an example from checkio template. */

/*

 <div class="vote_panel" rel="{{ node.pk }}" rel_user_vote="{{ user_vote.vote|default:0 }}">
 <div class="voting_result" title="{% for vote in node_votes %}{{ vote.user.username }}{% if vote.vote > 0 %}+{% endif %}{{ vote.vote }}; {% endfor %}">

 <span class="voting vote__pos">
 <span class="voting_score">{% if node.score %}{{node.score}}{% endif %}</span>
 <span class="voting_score_highlighted"></span>
 </span>
 </div>

 </div>
 */

    //Util functions
    // range function, stolen from underscore js
    // http://underscorejs.org/#range
    var range = window._ && _.range || function(start, stop, step) {
        if (arguments.length <= 1) {
            stop = start || 0;
            start = 0;
        }
        step = arguments[2] || 1;

        var len = Math.max(Math.ceil((stop - start) / step), 0);
        var idx = 0;
        var range = new Array(len);

        while(idx < len) {
            range[idx++] = start;
            start += step;
        }

        return range;
    };



    function highlight_user_vote($vote_panel, count, highlight_class){
        $vote_panel.find('.bn_vote.'+highlight_class).removeClass(highlight_class);
        if(!count){return}
        var range_highlight = range(count, 0 , count>0 && -1 || 1);
        var $direction_panel = $vote_panel.find('.vote_direction_panel.'+
            (count>0 && 'up' || 'down'));
        $.each(range_highlight,function(o, item){
            $direction_panel.find('.bn_vote[rel='+item+']').addClass(highlight_class);
        });
    }

    function set_current_score($vote_panel, total_score, user_score){
        $vote_panel.find('.voting_score_highlighted').text(total_score && total_score || '0');
        $vote_panel.find('.voting_score').text(total_score && total_score || '--')
        $vote_panel.attr('rel_user_vote',user_score)
        if(total_score>=0){
            $vote_panel.find('.voting_score').removeClass('negative').addClass('positive')
        }else{
            $vote_panel.find('.voting_score').removeClass('positive').addClass('negative')
        }
        highlight_user_vote($vote_panel, user_score, 'voted')
    }

    function show_default_score_vote($vote_panel){
        var user_score = parseInt($vote_panel.attr('rel_user_vote'));
        var total_score = parseInt($vote_panel.find('.voting_score').text()) || 0

        set_current_score($vote_panel, total_score, user_score)
    }

    function ajax_comment(url, $vote_panel, count){
        $vote_panel.addClass('loading');
        $.ajax({
            'type':'POST',
            'url':url,
            'dataType':'json',
            'success':function(data){
                $vote_panel.removeClass('loading');
                if(!data.success){
                    return alert(data.error_message);
                }
                set_current_score($vote_panel, data.score.score, count)
            },
            'error': function (request, status) {
                alert('HTTPError'+request.responseText);
                $vote_panel.removeClass('loading');
            }

        })
    }

    function default_title_generator($vote_panel, options, vote){
        if(vote && vote.possible_max_vote == 0){
            return options.title_can_not_vote
        }

        if(vote >= 0){
            if(options.possible_max_vote != undefined && vote > options.possible_max_vote){
                return options.title_low_level
            }
        }else if(vote < 0){
            if(options.possible_min_vote != undefined && vote < options.possible_min_vote){
                return options.title_low_level
            }
        }
        return 'Vote:'+vote
    }

    function default_class_generator($vote_panel, options, vote){
        if(vote >= 0){
            if(options.possible_max_vote != undefined && vote > options.possible_max_vote){
                return 'disabled'
            }
        }else{
            if(options.possible_min_vote != undefined && vote < options.possible_min_vote){
                return 'disabled'
            }
        }
        return ''
    }

    function default_href_generator($vote_panel, options, vote){
        return 'javascript:;'
    }

    function default_ajax_url_generator($vote_panel, options, vote){
        return '/vote/'+vote+'/'
    }

    function default_ajax_process_error(data, $vote_panel, options, vote){
        if(!data.success){
            alert(data.error_message);
            return true;
        }
    }

    function default_ajax_process_result_score(data, $vote_panel, options, vote){
        return data.score
    }



    function default_vote_action($vote_panel, options, vote, event){
        $.ajax({
            'type':options.ajax_type,
            'url':options.ajax_url_generator($vote_panel, options, vote),
            'dataType':options.ajax_data_type,
            'success':function(data){
                $vote_panel.removeClass('loading');
                if(options.ajax_process_error(data, $vote_panel, options, vote)){
                    return
                }
                set_current_score($vote_panel, options.ajax_process_result_score(data, $vote_panel, options, vote), vote)

                if(options.ajax_process_finish){
                    options.ajax_process_finish(data, $vote_panel, options, vote)
                }
            },
            'error': function (request, status) {
                alert('!!HTTPError'+request.responseText);
                $vote_panel.removeClass('loading');
            }
        })
    }

    var DEFAULTS = {
        'max_output_vote':3,
        'min_output_vote':-3,
        'title_generator':default_title_generator,
        'title_can_not_vote':'Your level is too low so you can not vote',
        'title_low_level':'Your level is too low for so high vote',
        'class_generator':default_class_generator,
        'href_generator':default_href_generator,
        'possible_max_vote':undefined,
        'possible_min_vote':undefined,
        'vote_action': default_vote_action,
        'ajax_url_generator':default_ajax_url_generator,
        'ajax_data_type':'json',
        'ajax_process_error':default_ajax_process_error,
        'ajax_process_result_score':default_ajax_process_result_score,
        'ajax_process_finish':undefined,
        'ajax_type':'GET'

    }

    $.vote_panel = function(options){
        DEFAULTS = $.extend(DEFAULTS, options)
    }

    var ACTIONS = {
        'set_score':function($vote_panel, options){
            $vote_panel.each(function(){
                var $el = $(this);
                set_current_score($el, options.total_score, options.user_score)
            })
        }
    }

    $.fn.vote_panel = function(options){
        if(options.action){
            ACTIONS[options.action](this, options)
            return this
        }

        options = $.extend({},DEFAULTS,options);




        this.each(function(){
            var $el = $(this);

            // html generation if it needs

            /*

            The result of html generation from

                    <div class="vote_panel small" rel="13" rel_user_vote="2" rel_total_score="10"></div>

            will be

             <div class="vote_panel small" rel="13" rel_user_vote="2" rel_total_score="10">
                    <div class="vote_direction_panel up" rel="up">
                        <a href="javascript:;" rel="5" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                        <a href="javascript:;" rel="4" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                        <a href="javascript:;" rel="3" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                        <a href="javascript:;" rel="2" class="bn_vote voted" title="Vote:2"></a>
                        <a href="javascript:;" rel="1" class="bn_vote voted" title="Vote:1"></a>
                    </div>
                    <div class="voting_result">
                        <div class="voting_score positive">10</div>
                        <div class="voting_score_highlighted">10</div>
                    </div>
                    <div class="vote_direction_panel down" rel="down">
                        <a href="javascript:;" rel="-1" class="bn_vote" title="Vote:-1"></a>
                        <a href="javascript:;" rel="-2" class="bn_vote" title="Vote:-2"></a>
                        <a href="javascript:;" rel="-3" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                        <a href="javascript:;" rel="-4" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                        <a href="javascript:;" rel="-5" class="bn_vote disabled" title="Your level is too low for so high vote"></a>
                    </div>
             </div>


             */

            if(!$el.children('.voting_result').length){
                $el.append('<div class="voting_result"></div>')
            }

            var $el_result = $el.children('.voting_result');
            if(!$el_result.children('.voting_score').length){
                if(!$el.attr('rel_total_score'))
                    throw "You should define any of rel_total_score attribute or .voting_score element inside"

                $el_result.append('<div class="voting_score">'+$el.attr('rel_total_score')+'</div>')
            }

            $el_result.children('.voting_score').click(function(e){
                if($el.hasClass('loading')){return}
                $el.addClass('loading');

                if(options.vote_action){
                    options.vote_action($el, options, 0, e)
                    e.stopPropagation()
                }
            }).attr('href', options.href_generator($el, options, 0))

            if(!$el_result.children('.voting_score_highlighted').length){
                $el_result.append('<div class="voting_score_highlighted"></div>')
            }


            var fn_html_bn_vote = function(item){
                var $vote = $('<a></a>');

                $vote.attr({
                    'href':options.href_generator($el, options, item),
                    'rel':item,
                    'title':options.title_generator($el, options, item)
                }).addClass('bn_vote').addClass(options.class_generator($el, options, item))
                    .click(function(e){
                        if($el.hasClass('loading')){return}
                        $el.addClass('loading');
                        if(options.vote_action){
                            options.vote_action($el, options, item, e)
                            e.stopPropagation()
                        }
                    })

                return $vote
            }

            var $vote_direction = $('<div></div>').insertBefore($el.find('.voting_result')).addClass('vote_direction_panel up').attr('rel','up');
            $.each(range(options.max_output_vote,0,-1), function(_,item){
                $vote_direction.append(fn_html_bn_vote(item))
            });

            $vote_direction = $('<div></div>').insertAfter($el.find('.voting_result')).addClass('vote_direction_panel down').attr('rel','down');
            $.each(range(-1,options.min_output_vote-1,-1), function(_,item){
                $vote_direction.append(fn_html_bn_vote(item))
            });

            show_default_score_vote($el)
        })

        this.find('.vote_direction_panel').mouseenter(function(){
            var $vote_panel = $(this).parents('.vote_panel').eq(0);
            if($vote_panel.hasClass('loading')){return}

            $vote_panel.find('.vote_direction_panel.active').removeClass('active')
            $vote_panel.addClass('active');

        }).mouseleave(function(){
                $(this).parents('.vote_panel').eq(0).removeClass('active');
            })

        this.find('.bn_vote, .voting_score').not('.disabled').mouseenter(function(){
                var $el = $(this);
                var $vote_panel = $el.parents('.vote_panel').eq(0);
                if($vote_panel.hasClass('loading')){return}

                var count = parseInt($el.attr('rel'));
                if(!count){return}
                //todo: highlight_user_vote
                highlight_user_vote($vote_panel, count, 'highlight')


                var user_vote = parseInt($vote_panel.attr('rel_user_vote'));

                $voting_score_highlighted = $vote_panel.find('.voting_score_highlighted');
                var highlight_score = ( parseInt( $vote_panel.find('.voting_score').text()) || 0 ) -
                    parseInt($vote_panel.attr('rel_user_vote')) + count
                $voting_score_highlighted.text(highlight_score)
                if(highlight_score>=0){
                    $voting_score_highlighted.addClass('positive').removeClass('negative')
                }else{
                    $voting_score_highlighted.addClass('negative').removeClass('positive')
                }
            })
        return this
    }
})(jQuery)