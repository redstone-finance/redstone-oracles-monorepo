import { gmail_v1 } from "googleapis";

export async function getNewestEmail(
  gmail: gmail_v1.Gmail,
  query: string
): Promise<gmail_v1.Schema$Message | undefined> {
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 1, // returns the newest message
    q: query,
  });

  const messages = res.data.messages;
  if (!messages || messages.length === 0) {
    return undefined;
  }

  const msgDetail = await gmail.users.messages.get({
    userId: "me",
    id: messages[0].id!,
    format: "full",
  });

  ensureEmailIntegrity(msgDetail.data);
  return msgDetail.data;
}

const TRUSTED_AUTHORIZER = "mx.google.com";
const AUTHORIZATION_RESULTS_HEADER = "authentication-results";

/**
 * An example of authentication-results header from google
 * authentication-results: mx.google.com;
 *        dkim=pass header.i=@caceis.com header.s=s1dxc header.b=aOltYZxI;
 *        spf=pass (google.com: domain of diffusion.fastnet@caceis.com designates 194.7.205.195 as permitted sender) smtp.mailfrom=diffusion.fastnet@caceis.com;
 *        dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=caceis.com
 */
export function ensureEmailIntegrity(msg: gmail_v1.Schema$Message) {
  const authResultsHeader = msg.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === AUTHORIZATION_RESULTS_HEADER
  )?.value;
  const context = `Integrity check failed for message ${msg.id}`;
  if (!authResultsHeader) {
    throw new Error(`${context}: missing ${AUTHORIZATION_RESULTS_HEADER} header`);
  }
  const authResults = authResultsHeader.split(";").map((result) => result.trim());
  if (authResults[0] !== TRUSTED_AUTHORIZER) {
    throw new Error(
      `${context}: message not authorized by ${TRUSTED_AUTHORIZER}, but ${authResults[0]}`
    );
  }
  authResults.shift();
  const methodsToCheck = ["spf", "dkim", "dmarc"];
  for (const method of methodsToCheck) {
    const satisfied = authResults.some((result) => result.startsWith(`${method}=pass`));
    if (!satisfied) {
      throw new Error(
        `${context}: ${method} check didn't pass, full ${AUTHORIZATION_RESULTS_HEADER}: ${authResultsHeader}`
      );
    }
  }
}

export async function downloadAttachments(gmail: gmail_v1.Gmail, message: gmail_v1.Schema$Message) {
  const messageId = message.id;
  const payload = message.payload;
  const attachments: Buffer[] = [];

  if (!payload?.parts || !messageId) {
    return attachments;
  }

  for (const part of payload.parts) {
    if (part.filename) {
      // heuristic, assume parts that contains filename are attachments
      let attachmentData: string | undefined;
      if (part.body?.attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: part.body.attachmentId,
        });

        attachmentData = attachment.data.data ?? undefined;
      } else if (part.body?.data) {
        attachmentData = part.body.data;
      }

      if (!attachmentData) {
        continue;
      }

      // all gmail attachments are base64url encoded
      attachments.push(Buffer.from(attachmentData, "base64"));
    }
  }
  return attachments;
}
