import type {
  FBPageAccount,
  FBConversation,
  FBMessage,
  FBPagingResponse,
} from "./types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export function getOAuthURL(): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`,
    scope:
      "pages_messaging,pages_read_engagement,pages_manage_metadata,pages_show_list",
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`,
    code,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

export async function getLongLivedToken(
  shortToken: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

export async function getPageAccessTokens(
  userToken: string
): Promise<FBPageAccount[]> {
  const res = await fetch(
    `${GRAPH_API}/me/accounts?access_token=${userToken}&fields=id,name,access_token,category`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

export async function getConversations(
  pageId: string,
  pageToken: string,
  after?: string
): Promise<FBPagingResponse<FBConversation>> {
  let url = `${GRAPH_API}/${pageId}/conversations?fields=id,snippet,updated_time,participants&limit=25&access_token=${pageToken}`;
  if (after) url += `&after=${after}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getMessages(
  conversationId: string,
  pageToken: string,
  after?: string
): Promise<FBPagingResponse<FBMessage>> {
  let url = `${GRAPH_API}/${conversationId}/messages?fields=id,message,from,created_time,attachments&limit=100&access_token=${pageToken}`;
  if (after) url += `&after=${after}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
