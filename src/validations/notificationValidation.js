export const validateNotification =
  (req, res, next) => {

    const {
      title,
      message,
      type,
    } = req.body;

    if (
      !title ||
      !message ||
      !type
    ) {

      return res.status(400).json({
        success: false,
        message:
          "title, message and type are required",
      });

    }

    next();
  };