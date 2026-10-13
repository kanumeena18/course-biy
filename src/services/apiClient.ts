export const authFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  return fetch(url, init);
};
