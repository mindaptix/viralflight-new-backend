import {
  connectToInfluencer,
  disconnectInfluencer,
  getConnectionStatus,
  listConnections,
} from "../../../application/connections/ConnectionService.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const createConnection = asyncHandler(async (req, res) => {
  const result = await connectToInfluencer({ user: req.user, body: req.body });
  sendSuccess(res, { statusCode: 201, ...result });
});

export const getConnections = asyncHandler(async (req, res) => {
  const result = await listConnections({ user: req.user });
  sendSuccess(res, result);
});

export const getConnectionByProfile = asyncHandler(async (req, res) => {
  const result = await getConnectionStatus({
    user: req.user,
    influencerProfileId: req.params.influencerProfileId,
  });
  sendSuccess(res, result);
});

export const deleteConnection = asyncHandler(async (req, res) => {
  const result = await disconnectInfluencer({
    user: req.user,
    influencerProfileId: req.params.influencerProfileId,
  });
  sendSuccess(res, result);
});
