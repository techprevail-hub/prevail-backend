export const validateNotifications = (
  req,
  res,
  next
) => {

  if (!req.body.notifications) {

    return res.status(400).json({
      success: false,
      message: "Notifications data is required",
    });

  }

  next();
};

export const validatePreferences = (
  req,
  res,
  next
) => {

  if (!req.body.preferences) {

    return res.status(400).json({
      success: false,
      message: "Preferences data is required",
    });

  }

  next();
};