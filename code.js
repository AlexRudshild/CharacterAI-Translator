// ==UserScript==
// @name         CharacterAI Translator
// @namespace    This script automatically translates chat messages to the user's local language.
// @version       1.0.2
// @description  try to take over the world!
// @author       titanRGB
// @icon         https://www.google.com/s2/favicons?sz=64&domain=greasyfork.org
// @match        https://*.character.ai/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @downloadURL https://raw.githubusercontent.com/AlexRudshild/CharacterAI-Translator/main/code.js
// @updateURL https://raw.githubusercontent.com/AlexRudshild/CharacterAI-Translator/main/code.js
// ==/UserScript==

"use strict";

const translate_button = '<button class="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium css-1yxmbwk revert-translate-btn" tabindex="0" type="button" style="fill: white; --darkreader-inline-fill: #e5e0d8;" data-darkreader-inline-fill=""><svg width="24" height="24" viewBox="0 0 24 24" focusable="false" class="ep0rzf NMm5M"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path></svg></button>';

let debug = false;
let current_message = null;

console.log(`ChatGPT Translator initializing...`);

setInterval(() => {
    try {
        addAutoTranslate();
    } catch (error) {
        console.error(error);
    }

    try {
        addRevertTranslate();
    } catch (error) {
        console.error(error);
    }
}, 100);

function addRevertTranslate() {
    if (!current_message) return;
    //var messages = document.querySelectorAll('div[class="swiper-no-swiping"]');
    let target = current_message.querySelector('.swiper-slide')?.children[0] ?? current_message;
    const button = target?.children[1]?.children[0]?.children[1]?.children[0];
    if (!button) return;
    const buttonHolder = button.parentElement;
    if (!buttonHolder) return;

    var buttonClone = buttonHolder.querySelector(`.revert-translate-btn`);

    if (buttonClone !== null) return;

    buttonClone = button.cloneNode(true);

    if (!buttonClone) return;

    buttonClone.classList.add('revert-translate-btn');
    buttonClone.style.fill = 'white';
    buttonHolder.insertBefore(buttonClone, buttonHolder.firstChild);
    buttonClone.innerHTML = icon;
    buttonClone.addEventListener('click', (e) => {
        toggleAutoTranslate();
    });
}



function toggleAutoTranslate() {
    const nodes = current_message.querySelectorAll("p[node]");
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.isDisableTranslate = !node.isDisableTranslate;
        if(node.isDisableTranslate){
            node.innerHTML = node.oldContent;
        }
        else{
            node.innerHTML = node.storeContent;
        }
    }
}

function addAutoTranslate() {
    //var messages = document.querySelectorAll('div[class="swiper-no-swiping"]');
    const mess_row = document.querySelector(".inner-scroll-view")?.children ?? [];

    for (let i = 0; i < mess_row.length; i++) {
        const message = mess_row[i];
        if (message.subbed) {
            continue;
        }
        subbToHover(message);
    }

    const messages = document.querySelectorAll("p[node]");

    for (let i = 0; i < messages.length; i++) {
        const msgMarkdownNode = messages[i];
        const parentMsgMarkdown = msgMarkdownNode.parentElement;

        if (msgMarkdownNode.isAutoTranslate) {
            continue;
        }

        msgMarkdownNode.isAutoTranslate = true;

        setInterval(async () => {
            await translateNode(msgMarkdownNode);
        }, 500);
    }
}

async function subbToHover(message){
    message.subbed = true;
    message.addEventListener('mouseover', (e) => {
        current_message = message;
    });
}

async function translateNode(node) {
    let nodeContent = node.innerHTML;

    if (node.isDisableTranslate || node.storeContent == nodeContent) return;
    if (node.oldContent == nodeContent) {
        node.innerHTML = node.storeContent;
        return;
    }
    if (node.isTranslating) return;

    node.isTranslating = true;

    const result = await translateHTML(nodeContent, "en", navigator.language);

    node.oldContent = nodeContent;
    node.innerHTML = result;
    node.isTranslating = false;
    node.storeContent = result;
}

async function translateHTML(html, sLang, tLang) {
    const excludeTagRegex = /<(pre|code)[^>]*>([\s\S]*?)<\/(pre|code)>/g;
    const excludeTags = [];
    const excludePlaceholder = "e0x1c";

    let htmlContent = html;

    let excludeTagsMatch;
    while ((excludeTagsMatch = excludeTagRegex.exec(html))) {
        excludeTags.push(excludeTagsMatch[0]);
        htmlContent = htmlContent.replace(
            excludeTagsMatch[0],
            `<${excludePlaceholder}${excludeTags.length - 1}>`
    );
    }

    if (debug) {
        console.log(`preTranslateHTML: ${html}`);
    }

    htmlContent = await translate(htmlContent, sLang, tLang);

    for (let i = 0; i < excludeTags.length; i++) {
        htmlContent = htmlContent.replace(
            `<${excludePlaceholder}${i}>`,
            excludeTags[i]
        );
    }

    if (debug) {
        console.log(`postTranslateHTML: ${htmlContent}`);
    }

    return htmlContent;
}

const cache = {};

async function translate(text, sLang, tLang, format, key) {
    try {
        if (debug) {
            console.log(`preTranslate: ${text}`);
        }

        if (format == null) {
            format = "html";
        }

        if (key == null) {
            key = "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw";
        }

        const cacheKey = text + "_" + format;

        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        const response = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: `https://translate.googleapis.com/translate_a/t?client=gtx&format=${format}&sl=${sLang}&tl=${tLang}&key=${key}`,
                data: `q=${encodeURIComponent(text)}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                onload: (response) => {
                    const json = JSON.parse(response.responseText);
                    if (Array.isArray(json[0])) {
                        resolve(json[0][0]);
                    } else {
                        resolve(json[0]);
                    }
                },
                onerror: (response) => {
                    reject(response.statusText);
                },
            });
        });

        cache[cacheKey] = response;

        if (debug) {
            console.log(`postTranslate: ${response}`);
        }

        return response;
    } catch (error) {
        console.error(error);
    }
}
