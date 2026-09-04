import {
  createQuoteRequest,
  getQuoteRequest,
  listQuoteRequests,
  respondToQuoteRequest,
  updateQuoteRequestStatus,
} from "../../../application/connections/QuoteRequestService.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const createQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await createQuoteRequest({ user: req.user, body: req.body });
  sendSuccess(res, { statusCode: 201, ...result });
});

export const listQuoteRequestsController = asyncHandler(async (req, res) => {
  const result = await listQuoteRequests({ user: req.user, query: req.query });
  sendSuccess(res, result);
});

export const getQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await getQuoteRequest({
    user: req.user,
    quoteRequestId: req.params.quoteRequestId,
  });
  sendSuccess(res, result);
});

export const respondQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await respondToQuoteRequest({
    user: req.user,
    quoteRequestId: req.params.quoteRequestId,
    body: req.body,
  });
  sendSuccess(res, result);
});

export const acceptQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await updateQuoteRequestStatus({
    user: req.user,
    quoteRequestId: req.params.quoteRequestId,
    action: "accept",
  });
  sendSuccess(res, result);
});

export const declineQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await updateQuoteRequestStatus({
    user: req.user,
    quoteRequestId: req.params.quoteRequestId,
    action: "decline",
  });
  sendSuccess(res, result);
});

export const withdrawQuoteRequestController = asyncHandler(async (req, res) => {
  const result = await updateQuoteRequestStatus({
    user: req.user,
    quoteRequestId: req.params.quoteRequestId,
    action: "withdraw",
  });
  sendSuccess(res, result);
});
