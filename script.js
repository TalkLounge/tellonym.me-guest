// ==UserScript==
// @name         tellonym.me guest
// @version      1.0.0
// @description  Load tellonym.me Tells without Login
// @author       TalkLounge (https://github.com/TalkLounge)
// @namespace    https://github.com/TalkLounge/tellonym.me-guest
// @license      MIT
// @match        https://tellonym.me/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/axios@0.24.0/dist/axios.min.js
// @require      https://cdn.jsdelivr.net/npm/luxon@2.3.0/build/global/luxon.min.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    var lastUrl;
    var counter;
    var isProfilePage;
    var isProfilePageLoaded;
    var user;
    var pos;
    var ul;
    var li;

    async function loadTells() {
        const data = await axios.get(`https://api.tellonym.me/profiles/name/${user}?limit=25&pos=${pos}`);
        const answers = data.data.answers;
        if (!answers.length) {
            return true;
        }

        for (var i = 0; i < answers.length; i++) {
            if (answers[i].type == "AD") { // Do not display ads
                continue;
            }

            var $html = $(li.prop("outerHTML"));
            $html.find("span").eq(0).text(answers[i].tell); // Question
            $html.find("span").eq(1).text(answers[i].answer); // Answer
            $html.find("[italic='false']").parent().parent().children().eq(1).text(luxon.DateTime.fromISO(answers[i].createdAt).toRelative()); // Time
            ul.append($html);
        }
    }

    async function scroll() {
        const scrollbar = ul.parent();
        if (scrollbar.prop("scrollTop") / scrollbar.prop("scrollHeight") > 0.75) { // Load more tells when scrolled down
            pos += 25;
            if (await loadTells()) { // End of tells reached
                isProfilePage = false;
            }
        }
    }

    async function init() {
        if (lastUrl != window.location.href) { // URL changed
            counter = 1;
            isProfilePage = true;
            isProfilePageLoaded = false;
        }

        if (!isProfilePage) { // Page is no profile page
            return;
        } else if (isProfilePageLoaded) { // Page is profile page, load more tells when scrolled down
            scroll();
            return;
        }

        lastUrl = window.location.href;

        var localUl = $("span[data-radium=true]").first().parent().parent().parent().parent().parent().parent().parent().parent().parent();
        const localLi = localUl.children().eq(1);

        if (!localLi.length) { // Page not loaded completely
            counter++;
            if (counter >= 20) { // Timeout after 10 seconds. Probably not a profile page
                isProfilePage = false;
            }
            return;
        }
        isProfilePage = true;
        isProfilePageLoaded = true;

        try { // Remove preview tells
            for (var j = 1; j <= 10; j++) {
                localUl.children().eq(1).remove();
            }
        } catch(e) {}

        user = window.location.href.split("/")[3];
        pos = 0;
        ul = localUl;
        li = localLi;
        await loadTells();

        try { // Remove login banner
            $("img[width='28']").parent().parent().remove();
        } catch(e) {}
    }

    window.setInterval(init, 500);
})();
