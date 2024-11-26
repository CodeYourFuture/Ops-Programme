function daysToMilliseconds(days) {
    return days * 24 * 60 * 60 * 1000;
}

function identifyAge(date) {
    const millis = new Date() - date;
    if (millis < daysToMilliseconds(7)) {
        return "this week";
    } else if (millis < daysToMilliseconds(7 * 4)) {
        return "this month";
    } else {
        return "old";
    }
}

export const modules = [
    "Module-User-Focused-Data",
    "Module-Structuring-And-Testing-Data",
    "Module-Data-Groups",
    "Module-Data-Flows",
];

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

export async function fetchPrs() {
    const prs = [];
    const responsePromises = [];
    for (const module of modules) {
        responsePromises.push(fetch(`https://github-issue-proxy.illicitonion.com/cached/120/repos/CodeYourFuture/${module}/pulls`));
    }
    const responses = await Promise.all(responsePromises);
    for (let i = 0; i < responses.length; i++) {
        const module = modules[i];
        const response = responses[i];
        for (const pr of await response.json()) {
            if (pr.state !== "open") {
                continue;
            }
            const needsReview = pr.labels.some((label) => label.name === "Needs Review");
            if (!needsReview) {
                continue;
            }
            const createdAt = new Date(Date.parse(pr["created_at"]));
            const updatedAt = new Date(Date.parse(pr["updated_at"]));

            prs.push(new PR(pr.html_url, pr.number, pr.user.login, pr.user.html_url, pr.title, module, identifyAge(createdAt), identifyAge(updatedAt)));
        }
    }
    return prs;
}
