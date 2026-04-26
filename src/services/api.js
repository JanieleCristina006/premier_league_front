const DEFAULT_API_BASE_URL = "http://localhost:3000";

export const SEASON = 2025;

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const normalizePath = (path) => {
  if (!path) {
    throw new Error("Caminho da API nao informado.");
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString();
};

export const normalizeRound = (round) => {
  const numericRound = Number(round);

  if (
    !Number.isInteger(numericRound) ||
    numericRound < 1 ||
    numericRound > 38
  ) {
    throw new Error(`Rodada invalida: ${round}`);
  }

  return numericRound;
};

export const buildApiUrl = (path, params) => {
  const queryString = buildQueryString(params);
  const url = `${API_BASE_URL}${normalizePath(path)}`;

  return queryString ? `${url}?${queryString}` : url;
};

export const fetchJson = async (path, { params, headers, ...options } = {}) => {
  const url = buildApiUrl(path, params);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
    ...options,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const details = responseBody ? ` - ${responseBody.slice(0, 250)}` : "";

    throw new Error(`Erro HTTP ${response.status} em ${url}${details}`);
  }

  return response.json();
};

export const getFixturesByRound = (round, season = SEASON) => {
  const normalizedRound = normalizeRound(round);

  return fetchJson(`/api/fixtures/round/${normalizedRound}`, {
    params: { season },
  });
};

export const getSeasonFixtures = (season = SEASON) =>
  fetchJson("/api/fixtures", {
    params: { season },
  });

export const getRounds = (season = SEASON) =>
  fetchJson("/api/rounds", {
    params: { season },
  });

export const getStandings = (season = SEASON) =>
  fetchJson("/api/standings", {
    params: { season },
  });
