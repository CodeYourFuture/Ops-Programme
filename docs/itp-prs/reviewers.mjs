import { fetchPrsWithComments } from "./common.mjs";

class ReviewerDetails {
    constructor(prs, latestCommentTime) {
        this.prs = prs;
        this.latestCommentTime = latestCommentTime;
    }
}

async function onLoad() {
    const reviewers = {};

    const prs = await fetchPrsWithComments();
    for (const pr of prs) {
        for (const comment of pr.comments) {
            if (!comment.isPrAuthor) {
                if (!(comment.userName in reviewers)) {
                    reviewers[comment.userName] = new ReviewerDetails(new Set([pr.url]), comment.createdAt);
                } else {
                    const reviewer = reviewers[comment.userName];
                    reviewer.prs.add(pr.url);
                    if (comment.createdAt > reviewer.latestCommentTime) {
                        reviewer.latestCommentTime = comment.createdAt;
                    }
                }
            }
        }
    }

    document.querySelector("#container").innerText = "";
    const sortedReviewers = Object.entries(reviewers)
        .sort(([_l, l], [_r, r]) => {
            return r.latestCommentTime - l.latestCommentTime;
        });
    document.querySelector("#reviewer-count").innerText = `(${sortedReviewers.length})`;
    for (const [userName, reviewerDetails] of sortedReviewers) {
        const daysSinceLastReview = Math.abs(Math.floor((reviewerDetails.latestCommentTime - new Date()) / (1000 * 60 * 60 * 24)));
        const card = document.querySelector("template.reviewer-card").content.cloneNode(true);
        card.querySelector(".username").innerText = userName;
        card.querySelector(".last-review").innerText = toIsoDate(reviewerDetails.latestCommentTime);
        card.querySelector(".days-since-last-review").innerText = daysSinceLastReview;
        card.querySelector(".total-reviewed-prs").innerText = reviewerDetails.prs.size;
        if (daysSinceLastReview > 30) {
            card.querySelector(".reviewer-card").classList.add("inactive");
        } else if (daysSinceLastReview < 14 && reviewerDetails.prs.size > 10) {
            card.querySelector(".reviewer-card").classList.add("super-active");
        }
        document.querySelector("#container").appendChild(card);
    }
}

function toIsoDate(date) {
    function pad(number) {
        let string = number.toString();
        if (string.length === 1) {
            string = "0" + string;
        }
        return string;
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

onLoad();
