import { fetchJobsFromAdzuna } from "./adzunaService.js";

export const getJobInsightsService = async () => {
  try {
    const jobs = await fetchJobsFromAdzuna();

    const topRoles = {};
    const topCompanies = {};
    const topLocations = {};

    jobs.forEach((job) => {
      // Roles
      const role = job.category?.label;
      if (role) {
        topRoles[role] = (topRoles[role] || 0) + 1;
      }

      // Companies
      const company = job.company?.display_name;
      if (company) {
        topCompanies[company] = (topCompanies[company] || 0) + 1;
      }

      // Locations
      const location = job.location?.display_name;
      if (location) {
        topLocations[location] = (topLocations[location] || 0) + 1;
      }
    });

    return {
      topRoles: Object.entries(topRoles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),

      topCompanies: Object.entries(topCompanies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),

      topLocations: Object.entries(topLocations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  } catch (error) {
    console.error("Job Insights Service Error:", error.message);

    return {
      topRoles: [],
      topCompanies: [],
      topLocations: [],
    };
  }
};