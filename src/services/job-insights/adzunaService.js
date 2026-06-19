import axios from "axios";

export const fetchJobsFromAdzuna = async () => {
  try {
    const response = await axios.get(
      "https://api.adzuna.com/v1/api/jobs/in/search/1",
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_APP_KEY,
          what: "software developer",
          results_per_page: 50,
        },
      }
    );

    return response.data.results || [];
  } catch (error) {
    console.error(
      "Adzuna Error:",
      error.response?.data || error.message
    );

    return [];
  }
};