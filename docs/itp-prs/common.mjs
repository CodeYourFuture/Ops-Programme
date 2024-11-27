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
    // status: one of: "Needs Review", "Reviewed", "Complete", "Closed", "Unknown"
    constructor(url, number, userName, userUrl, title, module, createdAge, updatedAge, status) {
        this.url = url;
        this.number = number;
        this.userName = userName;
        this.userUrl = userUrl;
        this.title = title;
        this.module = module;
        this.createdAge = createdAge;
        this.updatedAge = updatedAge;
        this.status = status;
        this.comments = [];
    }
}

class Comment {
    constructor(userName, isPrAuthor, createdAt) {
        this.userName = userName;
        this.isPrAuthor = isPrAuthor;
        this.createdAt = createdAt;
    }
}

function getStatus(state, labels) {
    // TODO: Check possibilities
    if (state !== "open") {
        return "Closed"
    }
    for (const possibleLabel of ["Needs Review", "Complete", "Reviewed"]) {
        if (labels.some((label) => label.name === possibleLabel)) {
            return possibleLabel;
        }
    }
    return "Unknown";
}

export async function fetchPrs() {
    const prs = [];
    const responsePromises = [];
    for (const module of modules) {
        responsePromises.push(fetch(`https://github-issue-proxy.illicitonion.com/cached/120/repos/CodeYourFuture/${module}/pulls?state=all`));
    }
    const responses = await Promise.all(responsePromises);
    for (let i = 0; i < responses.length; i++) {
        const module = modules[i];
        const response = responses[i];
        for (const pr of await response.json()) {
            const status = getStatus(pr.state, pr.labels);
            const createdAt = new Date(Date.parse(pr["created_at"]));
            const updatedAt = new Date(Date.parse(pr["updated_at"]));

            prs.push(new PR(pr.html_url, pr.number, pr.user.login, pr.user.html_url, pr.title, module, identifyAge(createdAt), identifyAge(updatedAt), status));
        }
    }
    return prs;
}

export async function fetchPrsWithComments() {
    const prsList = await fetchPrs();
    const prs = {};
    for (const pr of prsList) {
        prs[pr.url] = pr;
    }
    for (const module of modules) {
        const response = await fetch(`https://github-issue-proxy.illicitonion.com/cached/120/repos/CodeYourFuture/${module}/pulls/comments`);
        const responseObjects = await response.json();
        for (const comment of responseObjects) {
            const pr_url = comment.html_url.split("#")[0];
            const pr = prs[pr_url];
            pr.comments.push(new Comment(comment.user.login, comment.user.login === pr.userName, new Date(Date.parse(comment.created_at))));
        }
    }
    return prsList;
}