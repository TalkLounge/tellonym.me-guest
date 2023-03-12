// ==UserScript==
// @name            Tellonym.me Guest
// @name:de         Tellonym.me Gast
// @version         1.0.3
// @description     Load tellonym.me Tells without Login
// @description:de  Lade tellonym.me Tells ohne Anmeldung
// @author          TalkLounge (https://github.com/TalkLounge)
// @namespace       https://github.com/TalkLounge/tellonym.me-guest
// @license         MIT
// @match           https://tellonym.me/*
// @require         https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.slim.min.js
// @require         https://cdn.jsdelivr.net/npm/axios@0.24.0/dist/axios.min.js
// @require         https://cdn.jsdelivr.net/npm/luxon@2.3.0/build/global/luxon.min.js
// @grant           none
// ==/UserScript==

(function () {
    'use strict';
    let lastUrl;
    let counter;
    let isProfilePage;
    let isProfilePageLoaded;
    let scrollLoading;
    let user;
    let pos;
    let ul;
    let li;

    async function loadTells() {
        const data = await axios.get(`https://api.tellonym.me/profiles/name/${user}?limit=25&pos=${pos}`);
        const answers = data.data.answers;
        if (!answers.length) {
            return true;
        }

        for (let i = 0; i < answers.length; i++) {
            if (answers[i].type == "AD") { // Do not display ads
                continue;
            }

            let $html = $(li.prop("outerHTML"));
            $html.find("span").eq(0).text(answers[i].tell); // Question
            $html.find("span").eq(1).text(answers[i].answer); // Answer
            $html.find("[italic='false']").parent().parent().children().eq(1).text(luxon.DateTime.fromISO(answers[i].createdAt).toRelative()); // Time

            $html.find("span").eq(0).parent().parent().children().eq(1).remove(); // Remove show more
            $html.find("span").eq(1).parent().parent().children().eq(1).remove();

            const questionParent = $html.find("span").eq(0).parent().parent().parent().parent().parent();
            questionParent.css("padding-top", "12px"); // Set consistent spacing
            questionParent.css("padding-bottom", "12px");

            if (questionParent.children().length == 2) { // Remove badge
                questionParent.children().eq(0).remove();
            }

            questionParent.children().eq(0).css("margin-top", ""); // Set consistent spacing
            questionParent.children().eq(0).css("margin-bottom", "");

            if (answers[i].parent) { // Badge
                questionParent.prepend($("<div>").css("width", "max-content").css("margin-bottom", "6px").css("padding", "2px 10px").css("background-color", "rgb(243, 243, 243)").css("border-radius", "10px").append($("<div>").css("max-width", "714px").css("font-size", "12px").text(answers[i].parent.content)));
            }

            if (answers[i].likesCount) { // Do not shown 0 likes
                let likeDiv = $html.find("img").eq(-3).parent();
                likeDiv.css("margin-top", "10px");
                likeDiv.append($("<div>").text(answers[i].likesCount).css("margin-top", "4px").css("color", "gray"));
            }

            for (let j = 0; j < answers[i].media.length; j++) { // Media
                if (answers[i].media[j].type != 0) { // Only Pictures
                    continue;
                }
                $html.find("span").eq(1).append($("<br>"));
                $html.find("span").eq(1).append($("<a>").attr("href", answers[i].media[j].url).attr("target", "_blank"));
                $html.find("span").eq(1).find("a").append($("<img>").attr("src", answers[i].media[j].thumbUrl));
            }

            ul.append($html);
        }
    }

    async function scroll() {
        if (ul.find(":nth-last-child(10)") && ul.find(":nth-last-child(10)")[0].getBoundingClientRect().top <= document.body.clientHeight && ! scrollLoading) { // Load more tells when scrolled down
            pos += 25;
            scrollLoading = true;
            if (await loadTells()) { // End of tells reached
                isProfilePage = false;
            }
            scrollLoading = false;
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
        } else if (lastUrl && isProfilePageLoaded) { // Page is profile page, load more tells when scrolled down
            scroll();
            return;
        }

        lastUrl = window.location.href;

        if (lastUrl.includes("/answer/")) { // Do not run on https://tellonym.me/USER/answer/1234
            isProfilePage = false;
            return;
        }

        let localUl = ($("img[resizemode=stretch]").length ? $("img[resizemode=stretch]") : $("svg[height=38]").parent()).parent().parent().parent().parent().parent().parent().parent();
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
            for (let i = 1; i <= 10; i++) {
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

    window.setInterval(init, 1000);
})();
