import { getStudentsService } from "../../services/role-institute/student.service.js";

export const getStudents = async (req, res) => {
    try {

        const result = await getStudentsService(req.query);

        return res.status(200).json(result);

    } catch (error) {

        console.error("Student Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });

    }
};