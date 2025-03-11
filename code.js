// ==UserScript==
// @name         CharacterAI Translator
// @namespace    This script automatically translates chat messages to the user's local language.
// @version       1.0.8
// @description  try to take over the world!
// @author       titanRGB
// @icon         https://www.google.com/s2/favicons?sz=64&domain=greasyfork.org
// @match        https://*.character.ai/*
// @match        https://*.crushon.ai/*
// @match        https://*.janitorai.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM.registerMenuCommand
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @downloadURL https://raw.githubusercontent.com/AlexRudshild/CharacterAI-Translator/main/code.js
// @updateURL https://raw.githubusercontent.com/AlexRudshild/CharacterAI-Translator/main/code.js
// ==/UserScript==

"use strict";

const translate_icon =
      '<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" class="ep0rzf NMm5M"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path></svg>';

let debug = false;
let current_message = null;
let token = GM_getValue("GPT_Token");
let translator = GM_getValue("translator") ?? "google";

function menuItem1() {
    token = prompt("Input gpt api token");
    GM_setValue("GPT_Token", token);
}

function menuItem2() {
    translator = "google";
    GM_setValue("translator", translator);
}

function menuItem3() {
    translator = "gpt";
    GM_setValue("translator", translator);
}

GM_registerMenuCommand("Set GPT Token", menuItem1);
GM_registerMenuCommand("Set Google Translator", menuItem2);
GM_registerMenuCommand("Set GPT Translator", menuItem3);

const sites = {
    ["janitorai.com"]: {
        add_translate_button: () => {
            const targets = document.querySelectorAll("div[data-index]");
            for (let i = targets.length - 1; i >= 0; i--) {
                const index = Number(targets[i].getAttribute("data-index") ?? 0);
                if (index % 2 === 1) continue;
                const lis = targets[i].querySelectorAll("li");
                for (let i = 0; i < lis.length; i++) {
                    const target = lis[i];
                    const buttonHolder = target?.children.length > 1 ? target?.children[1] : target?.children[0];
                    if (!buttonHolder) continue;
                    const targetDiv = buttonHolder.children[1].children[0];

                    let buttonClone = targetDiv.querySelector(`.revert-translate-btn`);

                    if (buttonClone !== null) continue;

                    buttonClone = document.createElement("button");
                    buttonClone.className = "MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium css-1yxmbwk revert-translate-btn";
                    buttonClone.classList.add("revert-translate-btn");
                    buttonClone.style.fill = "white";
                    targetDiv.appendChild(buttonClone);
                    buttonClone.innerHTML = translate_icon;
                    buttonClone.addEventListener("click", async (e) => {
                        toggleAutoTranslate(buttonHolder.children[1].children[1]);
                    });
                }
            }
        },
        add_to_auto_translate: () => {
            const targets = document.querySelectorAll("div[data-index]");
            for (let i = 0; i < targets.length; i++) {
                const index = Number(targets[i].getAttribute("data-index") ?? 0);
                if (index % 2 === 1) continue;
                const lis = targets[i].querySelectorAll("li");
                for (let i = 0; i < lis.length; i++) {
                    const target = lis[i];
                    const message = target?.children.length > 1 ? target?.children[1] : target?.children[0];
                    const node = message?.children[1].children[1];

                    if (!node || node.parentNode.hasAttribute("is_auto_translate")) {
                        continue;
                    }

                    node.parentNode.setAttribute("is_auto_translate", "true");

                    if (node.innerHTML.match(/[а-яА-Я]/)) {
                        return;
                    }

                    setInterval(async () => {
                        await translateNode(node);
                    }, 500);
                }
            }
        },
    },
    ["crushon.ai"]: {
        add_translate_button: () => {
            const targets = document.querySelectorAll('div[class="text-sm font-bold dark:text-white-1 double-click-filter"]');
            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                const buttonHolder = target?.children[0];
                if (!buttonHolder) continue;

                var buttonClone = buttonHolder.querySelector(`.revert-translate-btn`);

                if (buttonClone !== null) continue;

                buttonClone = document.createElement("button");
                buttonClone.className = "MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium css-1yxmbwk revert-translate-btn";
                buttonClone.classList.add("revert-translate-btn");
                buttonClone.style.fill = "white";
                buttonHolder.insertBefore(buttonClone, buttonHolder.nextSibling);
                buttonClone.innerHTML = translate_icon;
                buttonClone.addEventListener("click", async (e) => {
                    const message = e.target.parentElement.parentElement.parentElement.parentElement.parentElement;
                    const node = message.querySelector('div[class="MarkdownText_CustomMarkdownText__P3bB6 not-prose w-full text-sm md:text-base"]');
                    const screen = document.querySelector("main").parentElement;
                    const scroll_pos = screen.scrollTop;
                    toggleAutoTranslate(node);
                    screen.scrollTop = scroll_pos;
                    await new Promise((resolve) => setTimeout(resolve, 30));
                    screen.scrollTop = scroll_pos;
                });
            }
        },
        add_to_auto_translate: () => {
            const messages = document.querySelectorAll("div[data-id]");

            for (let i = messages.length - 1; i >= 0; i--) {
                const node = messages[i];
                if (node.querySelector(".items-start .justify-end")) continue;
                const msgMarkdownNode = node.querySelector('div[class="MarkdownText_CustomMarkdownText__P3bB6 not-prose w-full text-sm md:text-base"]');

                if (!msgMarkdownNode || msgMarkdownNode.isAutoTranslate) {
                    continue;
                }

                msgMarkdownNode.isAutoTranslate = true;

                setInterval(async () => {
                    await translateNode(msgMarkdownNode);
                }, 500);
            }
        },
    },
    ["old.character.ai"]: {
        add_translate_button: () => {
            if (!current_message) return;

            let target = current_message.querySelector(".swiper-slide")?.children[0] ?? current_message;
            const button = target?.children[1]?.children[0]?.children[1]?.children[0];

            if (!button) return;
            const buttonHolder = button.parentElement;
            if (!buttonHolder) return;

            var buttonClone = buttonHolder.querySelector(`.revert-translate-btn`);

            if (buttonClone !== null) return;

            buttonClone = button.cloneNode(true);

            if (!buttonClone) return;

            buttonClone.classList.add("revert-translate-btn");
            buttonClone.style.fill = "white";
            buttonHolder.insertBefore(buttonClone, buttonHolder.firstChild);
            buttonClone.innerHTML = translate_icon;
            buttonClone.addEventListener("click", (e) => {
                const nodes = current_message.querySelectorAll("p[node]");
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    toggleAutoTranslate(node);
                }
            });
        },
        add_to_auto_translate: () => {
            const mess_row = document.querySelector(".inner-scroll-view")?.children ?? [];

            for (let i = 0; i < mess_row.length; i++) {
                const message = mess_row[i];
                if (message.subToMouseOver) continue;
                subbToHover(message);
            }

            const messages = document.querySelectorAll("p[node]");

            for (let i = messages.length - 1; i >= 0; i--) {
                const msgMarkdownNode = messages[i];

                if (msgMarkdownNode.isAutoTranslate) {
                    continue;
                }

                msgMarkdownNode.isAutoTranslate = true;

                setInterval(async () => {
                    await translateNode(msgMarkdownNode);
                }, 500);
            }
        },
    },
};

/** @type {sites['crushon.ai']} */
const rout = sites[document.location.hostname];

console.log(`ChatGPT Translator initializing...`);

setInterval(() => {
    try {
        rout.add_to_auto_translate();
    } catch (error) {
        console.error(error);
    }

    try {
        rout.add_translate_button();
    } catch (error) {
        console.error(error);
    }
}, 500);

function toggleAutoTranslate(node) {
    node.isDisableTranslate = !node.isDisableTranslate;
    if (node.isDisableTranslate) {
        node.innerHTML = node.oldContent;
    } else {
        node.innerHTML = node.storeContent;
    }
}

async function subbToHover(message) {
    message.subToMouseOver = true;
    message.addEventListener("mouseover", (e) => {
        current_message = message;
    });
}

async function translateNode(node) {
    let nodeContent = node.innerHTML;

    if (nodeContent.match(/[а-яА-Я]/)) {
        return;
    }
    if (node.isDisableTranslate || CompareStrings(node.storeContent, nodeContent)) return;
    if (node.oldContent == nodeContent) {
        node.innerHTML = node.storeContent;
        return;
    }
    if (node.isTranslating) return;

    node.isTranslating = true;

    let result = await translateHTML(nodeContent, "en", navigator.language);
    result = result.replace(/\&#?(quot|39)\;/g, '"');

    node.oldContent = nodeContent;
    node.innerHTML = result;
    node.storeContent = result;

    node.isTranslating = false;
}

const STRING_WILD_CARD = /[<>= \/\n]|div/gm;
function CompareStrings(str1 = "", str2 = "") {
    return str1.toLowerCase().replace(STRING_WILD_CARD, "") === str2.toLowerCase().replace(STRING_WILD_CARD, "");
}

async function translateHTML(html, sLang, tLang) {
    const excludeTagRegex = /<(pre|code)[^>]*>([\s\S]*?)<\/(pre|code)>/g;
    const excludeTags = [];
    const excludePlaceholder = "e0x1c";

    let htmlContent = html;

    let excludeTagsMatch;
    while ((excludeTagsMatch = excludeTagRegex.exec(html))) {
        excludeTags.push(excludeTagsMatch[0]);
        htmlContent = htmlContent.replace(excludeTagsMatch[0], `<${excludePlaceholder}${excludeTags.length - 1}>`);
    }

    if (debug) {
        console.log(`preTranslateHTML: ${html}`);
    }

    htmlContent = await translate(htmlContent, sLang, tLang);

    for (let i = 0; i < excludeTags.length; i++) {
        htmlContent = htmlContent.replace(`<${excludePlaceholder}${i}>`, excludeTags[i]);
    }

    if (debug) {
        console.log(`postTranslateHTML: ${htmlContent}`);
    }

    return htmlContent;
}

const cache = {};
let id = Math.floor(Math.random() * 1000000 + 100000);

async function getClientState() {
    const payload = {
        id: id,
        jsonrpc: "2.0",
        method: "getClientState",
        params: {
            v: "20180814",
            clientVars: {},
        },
    };
    const data = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://w.deepl.com/web?request_type=jsonrpc&il=${navigator.language}&method=getClientState`,
            data: JSON.stringify(payload),
            headers: {
                "content-type": "application/json",
                accept: "application/json",
            },
            onload: (response) => {
                const json = JSON.parse(response.responseText);
                resolve(json);
            },
            onerror: (response) => {
                reject(response.statusText);
            },
        });
    });

    console.log(data);
}

// fetch(
//   "https://w.deepl.com/web?request_type=jsonrpc&il=ru&method=getClientState",
//   {
//     headers: {
//       accept: "application/json",
//       "accept-language": "ru",
//       "content-type": "application/json",
//       "sec-ch-ua":
//         '"Opera GX";v="109", "Not:A-Brand";v="8", "Chromium";v="123"',
//       "sec-ch-ua-mobile": "?0",
//       "sec-ch-ua-platform": '"Windows"',
//       "sec-fetch-dest": "empty",
//       "sec-fetch-mode": "cors",
//       "sec-fetch-site": "same-site",
//     },
//     referrer: "https://www.deepl.com/",
//     referrerPolicy: "strict-origin-when-cross-origin",
//     body: '{"id":25130001,"jsonrpc":"2.0","method":"getClientState","params":{"v":"20180814","clientVars":{}}}',
//     method: "POST",
//     mode: "cors",
//     credentials: "include",
//   }
// );

async function translateDeepL(text, sLang, tLang) {
    const payload = {
        jsonrpc: "2.0",
        method: "LMT_handle_jobs",
        params: {
            jobs: [
                {
                    kind: "default",
                    sentences: [
                        {
                            text: text,
                            id: 1,
                            prefix: "",
                        },
                    ],
                    raw_en_context_before: [],
                    raw_en_context_after: [],
                    preferred_num_beams: 4,
                },
            ],
            lang: {
                target_lang: tLang.toUpperCase(),
                preference: {
                    weight: {},
                    default: "default",
                },
                source_lang_computed: sLang.toLocaleUpperCase(),
            },
            priority: 1,
            commonJobParams: {
                mode: "translate",
                browserType: 1,
                textType: "plaintext",
            },
            timestamp: Date.now(),
        },
        id: id,
    };

    const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://www2.deepl.com/jsonrpc?method=LMT_handle_jobs`,
            data: JSON.stringify(payload),
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            onload: (response) => {
                const json = JSON.parse(response.responseText);
                const texts = json.result.texts;
                resolve(texts[0].chunks[0].sentences[0].text);
            },
            onerror: (response) => {
                reject(response.statusText);
            },
        });
    });

    return response;
}

async function translate(text, sLang = "", tLang = "", format, key) {
    try {
        if (debug) {
            console.log(`preTranslate: ${text}`);
        }

        if (key == null) {
            key = "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw";
        }

        const cacheKey = text + "_" + format;

        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        let response;

        if (translator === "gpt") {
            response = await GptTranslate(text, sLang, tLang, token);
        } else {
            response = await GoogleTranslate(text, sLang, tLang, key);
        }

        cache[cacheKey] = response;

        if (debug) {
            console.log(`postTranslate: ${response}`);
        }

        return response;
    } catch (error) {
        console.error(error);
    }
}

async function GoogleTranslate(text, sLang, tLang, key) {
    const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://translate.googleapis.com/translate_a/t?client=gtx&format=html&sl=${sLang}&tl=${tLang}&key=${key}`,
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

    return response;
}

async function GptTranslate(text, sLang, tLang, key) {
    const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://api.openai.com/v1/chat/completions`,
            data: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "developer",
                        content: `Ты переводчик ты должен только переводить текст на русский ничего кроме перевода не отвечай и не изменяй структуру элементов.`,
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
            }),
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            onload: (response) => {
                const json = JSON.parse(response.responseText);
                resolve(json.choices[0].message.content);
            },
            onerror: (response) => {
                reject(response.statusText);
            },
        });
    });

    return response;
}
