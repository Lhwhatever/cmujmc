export const dateFmt = new Intl.DateTimeFormat();

export const formatDateRange = (
  startDate?: Date | null,
  endDate?: Date | null,
) => {
  if (startDate) {
    if (endDate) {
      return dateFmt.formatRange(startDate, endDate);
    } else {
      return `Starts ${dateFmt.format(startDate)}`;
    }
  } else {
    if (endDate) {
      return `Ends ${dateFmt.format(endDate)}`;
    } else {
      return null;
    }
  }
};
