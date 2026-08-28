import supabase from "../../supabaseClient.js";

/**
 * GET PLACEMENT REPORT
 */
export const getPlacementReportService = async (
  instituteId
) => {
  try {
    /**
     * 1. Fetch accepted students of this institute
     *
     * These students are considered eligible for placement.
     */
    const {
      data: students,
      error: studentsError,
    } = await supabase
      .from("student_invitations")
      .select(`
        id,
        student_id,
        student_name,
        email,
        course,
        branch,
        batch,
        status
      `)
      .eq("institute_id", instituteId)
      .eq("status", "accepted");

    if (studentsError) {
      throw new Error(studentsError.message);
    }

    /**
     * 2. Fetch placement records
     */
    const {
      data: placementRecords,
      error: placementError,
    } = await supabase
      .from("placement_records")
      .select(`
        id,
        institute_id,
        student_id,
        invitation_id,
        placement_status,
        placement_type,
        company_name,
        job_role,
        package,
        placement_date,
        created_at
      `)
      .eq("institute_id", instituteId);

    if (placementError) {
      throw new Error(placementError.message);
    }

    /**
     * 3. Create placement record map
     *
     * Key = invitation_id
     */
    const placementMap = new Map();

    placementRecords.forEach((record) => {
      placementMap.set(
        record.invitation_id,
        record
      );
    });

    /**
     * 4. Prepare student placement data
     */
    const placementStudents = students.map(
      (student) => {
        const placement =
          placementMap.get(student.id);

        const placementStatus =
          placement?.placement_status ||
          "not_placed";

        return {
          studentId:
            placement?.student_id ||
            student.student_id ||
            null,

          invitationId: student.id,

          name: student.student_name,

          email: student.email,

          course: student.course,

          branch: student.branch,

          batch: student.batch,

          placementStatus,

          placementType:
            placement?.placement_type ||
            null,

          companyName:
            placement?.company_name ||
            null,

          jobRole:
            placement?.job_role ||
            null,

          package:
            placement?.package ||
            null,

          placementDate:
            placement?.placement_date ||
            null,
        };
      }
    );

    /**
     * 5. Calculate total eligible students
     */
    const totalEligibleStudents =
      placementStudents.length;

    /**
     * 6. Calculate placed students
     */
    const placedStudents =
      placementStudents.filter(
        (student) =>
          student.placementStatus === "placed"
      );

    const totalPlacedStudents =
      placedStudents.length;

    /**
     * 7. Calculate not placed students
     */
    const notPlacedStudents =
      totalEligibleStudents -
      totalPlacedStudents;

    /**
     * 8. Calculate placement rate
     */
    const placementRate =
      totalEligibleStudents > 0
        ? Number(
            (
              totalPlacedStudents /
              totalEligibleStudents
            ) *
              100
          ).toFixed(2)
        : 0;

    /**
     * 9. Calculate campus placements
     */
    const campusPlacements =
      placedStudents.filter(
        (student) =>
          student.placementType === "campus"
      ).length;

    /**
     * 10. Calculate off-campus placements
     */
    const offCampusPlacements =
      placedStudents.filter(
        (student) =>
          student.placementType ===
          "off_campus"
      ).length;

    /**
     * 11. Calculate top hiring companies
     */
    const companyMap = {};

    placedStudents.forEach((student) => {
      if (!student.companyName) {
        return;
      }

      if (!companyMap[student.companyName]) {
        companyMap[student.companyName] = 0;
      }

      companyMap[student.companyName] += 1;
    });

    const topHiringCompanies =
      Object.entries(companyMap)
        .map(
          ([companyName, hiredStudents]) => ({
            companyName,
            hiredStudents,
          })
        )
        .sort(
          (a, b) =>
            b.hiredStudents -
            a.hiredStudents
        )
        .slice(0, 10);

    /**
     * 12. Return final report
     */
    return {
      summary: {
        totalEligibleStudents,
        placedStudents:
          totalPlacedStudents,
        notPlacedStudents,
        placementRate,
        campusPlacements,
        offCampusPlacements,
      },

      topHiringCompanies,

      students: placementStudents,
    };

  } catch (error) {
    console.error(
      "❌ Placement report service error:",
      error
    );

    throw error;
  }
};