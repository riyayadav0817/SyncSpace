export function getOnlineUsers(awareness) {
  if (!awareness) {
    return [];
  }

  const users = [];

  awareness.getStates().forEach((state, clientId) => {
    const name = state?.user?.name?.trim();

    if (!name) {
      return;
    }

    users.push({
      clientId,
      name,
      cursor: state?.cursor || null,
    });
  });

  return users;
}

export function subscribeToAwareness(awareness, callback) {
  if (!awareness || typeof callback !== "function") {
    return () => {};
  }

  const handleChange = () => {
    callback(getOnlineUsers(awareness));
  };

  awareness.on("change", handleChange);

  // Send current users immediately
  handleChange();

  // Cleanup
  return () => {
    awareness.off("change", handleChange);
  };
}