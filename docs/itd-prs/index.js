const modules = [
    "Module-User-Focused-Data",
    "Module-Structuring-And-Testing-Data",
    "Module-Data-Groups",
    "Module-Data-Flows",
];
const ageToEmoji = {
    "this week": "🟢",
    "this month": "🟠",
    "old": "🔴",
};
const now = new Date();

class PR {
    constructor(url, number, userName, userUrl, title, module, createdAge, updatedAge) {
        this.url = url;
        this.number = number;
        this.userName = userName;
        this.userUrl = userUrl;
        this.title = title;
        this.module = module;
        this.createdAge = createdAge;
        this.updatedAge = updatedAge;
    }
}

const awaitingReviewByAge = {};
const prsByModule = {};

// 400/700/900
function badness(name, count) {
    if ((name === "old" || name == "this month") && count > 0) {
        return 900;
    }
    if (name === "this week" && count > 20) {
        return 900;
    }
    if (name === "this week" && count > 10) {
        return 700;
    }
    return 400;
}

function computeStatusClass(awaitingReview) {
    const score = Math.max(...Object.entries(awaitingReview).map(([name, count]) => badness(name, count)));
    if (score === 900) {
        return "status-bad";
    } else if (score === 700) {
        return "status-medium";
    } else {
        return "status-good";
    }
}

function daysToMilliseconds(days) {
    return days * 24 * 60 * 60 * 1000;
}

function identifyAge(date) {
    const millis = now - date;
    if (millis < daysToMilliseconds(7)) {
        return "this week";
    } else if (millis < daysToMilliseconds(7 * 4)) {
        return "this month";
    } else {
        return "old";
    }
}

async function onLoad() {
    for (const module of modules) {
        awaitingReviewByAge[module] = {
            "this week": 0,
            "this month": 0,
            "old": 0,
        };
        prsByModule[module] = [];

        let response = await fetch(`https://github-issue-proxy.illicitonion.com/cached/1/repos/CodeYourFuture/${module}/pulls`);
        let prs = await response.json();

        for (const pr of prs) {
            if (pr.state !== "open") {
                continue;
            }
            const needsReview = pr.labels.some((label) => label.name === "Needs Review");
            if (!needsReview) {
                continue;
            }
            const createdAt = new Date(Date.parse(pr["created_at"]));
            const updatedAt = new Date(Date.parse(pr["updated_at"]));

            const prObj = new PR(pr.html_url, pr.number, pr.user.login, pr.user.html_url, pr.title, module, identifyAge(createdAt), identifyAge(updatedAt));
            awaitingReviewByAge[module][prObj.updatedAge]++;
            prsByModule[module].push(prObj);
        }
        prsByModule[module].sort((l, r) => {
            if (l.updatedAge > r.updatedAge) {
                return 1;
            } else if (l.updatedAge < r.updatedAge) {
                return -1;
            } else {
                return l.number - r.number;
            }
        });
    }

    document.querySelector("#pr-list").innerText = "";

    for (const module of modules) {
        const awaitingReview = awaitingReviewByAge[module];
        const totalPending = Object.values(awaitingReview).reduce((acc, cur) => acc + cur, 0);

        const overviewCard = document.querySelector("template.overview-card").content.cloneNode(true);
        overviewCard.querySelector(".module").innerText = `${module} (${totalPending})`;
        for (const [age, count] of Object.entries(awaitingReview)) {
            const bucket = overviewCard.querySelector(`.age-bucket.${age.replaceAll(" ", "-")} .count`);
            bucket.innerText = count;
            console.log(`badness(${age}, ${count}) = ${badness(age, count)}`);
            if (badness(age, count) === 900) {
                bucket.classList.add("problem");
            }
        }
        //`${} / ${awaitingReview["this month"]} / ${awaitingReview["old"]}`;
        overviewCard.querySelector(".overview-card").classList.add(computeStatusClass(awaitingReview));
        document.querySelector("#overview").appendChild(overviewCard);

        if (totalPending) {
            const modulePrList = document.querySelector("template.pr-list").content.cloneNode(true);
            modulePrList.querySelector(".module").innerText = `${module} (${totalPending})`;
            for (const pr of prsByModule[module]) {
                const prInList = document.querySelector("template.pr-in-list").content.cloneNode(true);

                prInList.querySelector(".emoji").innerText = ageToEmoji[pr.updatedAge];

                const prLink = prInList.querySelector("a.pr-link");
                prLink.href = pr.url;
                prLink.innerText = `${pr.title}`;

                const userLink = prInList.querySelector("a.user-link");
                userLink.href = pr.userUrl;
                userLink.innerText = `${pr.userName}`;

                prInList.querySelector(".pr-number").innerText = pr.number;
                modulePrList.appendChild(prInList);
            }
            document.querySelector("#pr-list").appendChild(modulePrList);
        }
    }
}

onLoad();
