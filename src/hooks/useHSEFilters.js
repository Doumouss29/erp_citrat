import { useState, useMemo } from 'react';

const DEFAULT_FILTERS = {
  search: '',
  type: 'all',
  severity: 'all',
  status: 'all',
  zone: 'all',
  date_from: '',
  date_to: ''
};

export function useHSEFilters(events) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const searchMatch = filters.search === '' || 
        event.reference?.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.persons_involved?.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.departure_point?.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.arrival_point?.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.circumstances?.toLowerCase().includes(filters.search.toLowerCase());

      const typeMatch = filters.type === 'all' || event.event_type_code === filters.type;
      const severityMatch = filters.severity === 'all' || event.severity === filters.severity;
      const statusMatch = filters.status === 'all' || event.status === filters.status;
      const zoneMatch = filters.zone === 'all' || event.zone === filters.zone;
      const dateFromMatch = !filters.date_from || event.date_event >= filters.date_from;
      const dateToMatch = !filters.date_to || event.date_event <= filters.date_to;

      return searchMatch && typeMatch && severityMatch && statusMatch && zoneMatch && dateFromMatch && dateToMatch;
    });
  }, [events, filters]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return {
    filters,
    setFilters,
    filteredEvents,
    resetFilters,
  };
}