export function getOnlineUsers(awareness) {
  if (!awareness) {
    return [];
  }

  const users = [];

  awareness.getStates().forEach(
    (state, clientId) => {
      const name =
        state?.user?.name?.trim();

      if (!name) {
        return;
      }

      users.push({
        clientId,
        name,
      });
    }
  );

  return users;
}

export function subscribeToAwareness(
  awareness,
  callback
) {
  if (
    !awareness ||
    typeof callback !== "function"
  ) {
    return () => {};
  }

  const handleChange = () => {
    callback(
      getOnlineUsers(awareness)
    );
  };

  awareness.on(
    "change",
    handleChange
  );

  callback(
    getOnlineUsers(awareness)
  );

  return () => {
    awareness.off(
      "change",
      handleChange
    );
  };
}