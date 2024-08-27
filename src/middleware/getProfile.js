const getProfile = async (req, res, next) => {
  const { Profile } = req.app.get("models");
  const profile = await Profile.findOne({
    where: { id: req.get("profile_id") || 0 },
  });
  if (!profile) return res.status(401).end();
  req.profile = profile;
  next();
};

const isAdmin = async (req, res, next) => {
  const { User } = req.app.get("models");
  const user = await User.findOne({
    where: { id: req.get("profile_id") || 0 },
  });
  if (!user) return res.status(401).end();

  if (user.role !== "admin") return res.status(403).end();
  req.user = user;
  next();
};
module.exports = { getProfile, isAdmin };
