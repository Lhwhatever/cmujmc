export const formatDateRange = (
  startDate?: Date | null,
  endDate?: Date | null,
) => {
  const fmt = new Intl.DateTimeFormat();
  if (startDate) {
    if (endDate) {
      return fmt.formatRange(startDate, endDate);
    } else {
      return `Starts ${fmt.format(startDate)}`;
    }
  } else {
    if (endDate) {
      return `Ends ${fmt.format(endDate)}`;
    } else {
      return null;
    }
  }
};
