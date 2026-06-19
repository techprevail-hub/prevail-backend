import { fetchJobsFromAdzuna } from "./adzunaService.js";

export const getJobInsightsService = async (
  page = 1,
  limit = 10
) => {
  const jobs = await fetchJobsFromAdzuna();

  const total = jobs.length;

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedJobs = jobs.slice(
    startIndex,
    endIndex
  );

  return {
    jobs: paginatedJobs,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};