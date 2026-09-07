import {
  createConnectionRequest,
  getConnectionRequestById,
  listUserConnectionRequests,
  updateConnectionRequestStatus,
} from "../../../application/connections/ConnectionRequestService.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const createConnectionRequestController = asyncHandler(
  async (req, res) => {
    const result = await createConnectionRequest({
      user: req.user,
      body: req.body,
    });
    sendSuccess(res, { statusCode: 201, ...result });
  }
);

export const listConnectionRequestsController = asyncHandler(
  async (req, res) => {
    const result = await listUserConnectionRequests({
      user: req.user,
      query: req.query,
    });
    sendSuccess(res, result);
  }
);

export const getConnectionRequestByIdController = asyncHandler(
  async (req, res) => {
    const result = await getConnectionRequestById({
      user: req.user,
      requestId: req.params.id || req.params.requestId,
    });
    sendSuccess(res, result);
  }
);

export const updateConnectionRequestStatusController = asyncHandler(
  async (req, res) => {
    const result = await updateConnectionRequestStatus({
      user: req.user,
      requestId: req.params.id || req.params.requestId,
      body: req.body,
    });
    sendSuccess(res, result);
  }
);
