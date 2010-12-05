// ==UserScript==
// @name           LDR - Toggle Button for Notifier
// @namespace      http://profile.livedoor.com/ronekko/
// @description    LDRの更新通知設定切り替えボタンをフィードのヘッダに設置する
// @include        http://reader.livedoor.com/reader/
// @include        http://reader.livedoor.com/subscribe/*
// @version        20101112
// ==/UserScript==

var w = unsafeWindow;
var l = w.console ? w.console.log : function(){};
var d = w.console ? w.console.dir : function(){};

if(location.href.indexOf('http://reader.livedoor.com/subscribe/') === 0){
	(function(){
		var params = GM_getValue('params');
		params = params ? JSON.parse(params) : [];
		var form = document.querySelector('.page_subscribe form');
		
		form.addEventListener('submit', function(e){
			var links = [];
			var feedlinks = document.getElementsByName('feedlink');
			Array.forEach(feedlinks, function(el){
				el.checked && links.push(el.value);
			});
			if(!links.length) return;
			
			var param = {feedlinks: links, ignore: 1};
			params.push(param)
			var json = JSON.stringify(params);
			GM_setValue('params', json);
		}, true);
	})();
	return;
}

GM_addStyle('.widget_toggle_button_for_notifier{border: solid thin #777777; padding: 1px; color:#222222; background-color: #D7EBFF; cursor: pointer;}');
GM_addStyle('.widget_toggle_button_for_notifier_on{background-color: #AAFFAA;}');

w.channel_widgets.add('toggle_button_for_notifier', function(feed){
	return '通知[]';
});

w.register_hook('AFTER_PRINTFEED', function(feed){
	var sid = feed.subscribe_id;
	var item = w.subs_item(sid);
	var ignore = !!item.ignore_notify;
	var tbfn = document.getElementsByClassName('widget_toggle_button_for_notifier')[0];
	
	setState(ignore);
	tbfn.addEventListener('click', function(){
		setTimeout(function(param){
			GM_xmlhttpRequest({
				method : "POST",
				url : 'http://reader.livedoor.com/api/feed/set_notify',
				data : w.Object.toQuery({
					ApiKey : w.LDR_getApiKey(),
					subscribe_id : param._sid,
					ignore : param._ignore ? 1 : 0
				}),
				headers : { 'Content-Type' : 'application/x-www-form-urlencoded' },
				onload :  function(res){
					if(param._ignore){
						w.message("通知設定を無効にしました");
					}else{
						w.message("通知設定を有効にしました");
					}
					
					if(w.get_active_feed().subscribe_id === param._sid){
						setState(param._ignore);
					}
					ignore = param._ignore;
				}
			});
		}, 0, {_sid:sid, _ignore:!ignore});
	}, false);
	
	function setState(ignore){
		if(ignore){
			w.removeClass(tbfn, 'widget_toggle_button_for_notifier_on');
			tbfn.textContent = '通知[無効]';
		}else{
			w.addClass(tbfn, 'widget_toggle_button_for_notifier_on');
			tbfn.textContent = '通知[有効]';
		}
	}
});

w.register_hook('AFTER_SUBS_LOAD', function(){
	setTimeout(function(){
		var params = GM_getValue('params');
		if(!params){ return; }
		
		params = JSON.parse(params);
		var feedInfo = {};
		var len = params.length;
		params.forEach(function(param){
			var ignore = param.ignore;
			param.feedlinks.forEach(function(feedlink){
				feedInfo[feedlink] = ignore;
			});
		});
		
		GM_xmlhttpRequest({
			method : "POST",
			url : 'http://reader.livedoor.com/api/lite_subs',
			data : w.Object.toQuery({ApiKey : w.LDR_getApiKey()}),
			headers : { 'Content-Type' : 'application/x-www-form-urlencoded' },
			onload :  function(res){
				mySubs = {};
				var feeds = JSON.parse(res.responseText);
				feeds.filter(function(feed){
					return feedInfo[feed.feedlink];
				})
				.forEach(function(feed){
					setTimeout(function(param){
						GM_xmlhttpRequest({
							method : "POST",
							url : 'http://reader.livedoor.com/api/feed/set_notify',
							data : w.Object.toQuery({
								ApiKey : w.LDR_getApiKey(),
								subscribe_id : param._sid,
								ignore : param._ignore
							}),
							headers : { 'Content-Type' : 'application/x-www-form-urlencoded' },
							onload :  function(res){
								delete feedInfo[param._feedlink];
							}
						});
					}, 0, {_sid:feed.subscribe_id, _ignore:feedInfo[feed.feedlink], _feedlink: feed.feedlink});
				});
			}
		});
		
		setTimeout(function(){
			if(isEmpty(feedInfo)){
				GM_setValue('params', '');
			}else{
				setTimeout(arguments.callee, 1000);
			}
		}, 1000);
			
		function isEmpty(obj){
			for(var k in obj) return false;
			return true;
		}
	}, 0);
});