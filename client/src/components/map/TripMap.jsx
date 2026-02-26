import DayMap from './DayMap';

/**
 * Full trip map showing all days with different colors.
 */
export default function TripMap({ days }) {
  if (!days?.length) return null;
  return <DayMap days={days} allDays />;
}
