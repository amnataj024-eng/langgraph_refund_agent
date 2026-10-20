
const form = document.getElementById("supportForm");
const messageInput = document.getElementById("message");
const threadInput = document.getElementById("threadId");
const submitBtn = document.getElementById("submitBtn");

const emptyState = document.getElementById("emptyState");
const result = document.getElementById("result");
const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const responseText = document.getElementById("responseText");
const details = document.getElementById("details");
const reviewBox = document.getElementById("reviewBox");
const reviewText = document.getElementById("reviewText");
const approveBtn = document.getElementById("approveBtn");
const rejectBtn = document.getElementById("rejectBtn");
const notice = document.getElementById("notice");

let currentThreadId = createThreadId();
let pendingApproval = false;

threadInput.value = currentThreadId;

function createThreadId() {
  return "refund-" + crypto.randomUUID();
}

function setNotice(message) {
  notice.textContent = message || "";
}

function showResult(data) {
  emptyState.hidden = true;
  result.hidden = false;

  const status = data.status || "completed";
  pendingApproval = status === "awaiting_approval";

  resultBadge.textContent = status.replaceAll("_", " ");
  resultTitle.textContent = pendingApproval
    ? "Refund awaiting review"
    : "Request processed";

  responseText.textContent =
    data.response ||
    (pendingApproval
      ? "A human reviewer must decide whether to approve this refund."
      : "The request has been processed.");

  const interrupts = data.interrupts || [];

  if (interrupts.length > 0) {
    details.hidden = false;
    details.textContent = JSON.stringify(interrupts, null, 2);

    const review = interrupts[0];

    reviewText.textContent =
      `Order: ${review.order_id || "Not specified"} · ` +
      `Amount: ${review.amount == null ? "Not specified" : "$" + review.amount} · ` +
      (review.question || "Please review this request.");
  } else {
    details.hidden = true;
    details.textContent = "";
  }

  reviewBox.hidden = !pendingApproval;
  approveBtn.disabled = false;
  rejectBtn.disabled = false;
  approveBtn.textContent = "Approve refund";
  rejectBtn.textContent = "Reject";
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setNotice("");

  const message = messageInput.value.trim();

  if (!message) {
    setNotice("Please enter your message.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  try {
    const data = await postJSON("/support", {
      thread_id: currentThreadId,
      message: message
    });

    showResult(data);
  } catch (error) {
    setNotice(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send Request <span>→</span>';
  }
});

async function submitReview(approved) {
  if (!pendingApproval) return;

  approveBtn.disabled = true;
  rejectBtn.disabled = true;
  setNotice("");

  try {
    const data = await postJSON(
      `/review/${encodeURIComponent(currentThreadId)}`,
      { approved: approved }
    );

    showResult(data);
  } catch (error) {
    setNotice(error.message);
    approveBtn.disabled = false;
    rejectBtn.disabled = false;
  }
}

approveBtn.addEventListener("click", () => submitReview(true));
rejectBtn.addEventListener("click", () => submitReview(false));

document.querySelectorAll(".example").forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.message;
    messageInput.focus();
  });
});
