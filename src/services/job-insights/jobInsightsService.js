import { fetchJobsFromAdzuna } from "./adzunaService.js";

// --------------------------------------------------
// Get Job Insights
// --------------------------------------------------
export const getJobInsightsService = async (
  page = 1,
  limit = 10,
  search = "software developer"
) => {
  // Fetch jobs based on search keyword
  const jobs = await fetchJobsFromAdzuna(search);

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