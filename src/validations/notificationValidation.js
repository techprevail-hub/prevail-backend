export const validateNotification =
  (req, res, next) => {

    const {
      title,
      message,
      type,
      category,
      actionUrl,
    } = req.body;

    if (
      !title ||
      !message ||
      !type ||
      !category ||
      !actionUrl
    ) {

      return res.status(400).json({
        success: false,
        message:
          "title, message, type, category and actionUrl are required",
      });

    }

    next();

  };