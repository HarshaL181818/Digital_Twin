import React, { useState, useEffect } from 'react';

const RouteManager = ({ map }) => {
  const [routes, setRoutes] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [routeType, setRouteType] = useState('major');
  const [clickedPoints, setClickedPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [error, setError] = useState('');

  const roadTypes = [
    { value: 'major', label: 'Major Road', color: '#000000', width: 5 },
    { value: 'minor', label: 'Minor Road', color: '#808080', width: 3 },
  ];

  useEffect(() => {
    if (!map) return;

    const handleStyleLoad = () => {
      setIsStyleLoaded(true);
    };

    if (map.isStyleLoaded()) {
      setIsStyleLoaded(true);
    } else {
      map.on('style.load', handleStyleLoad);
    }

    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !isStyleLoaded) return;
    loadRoutes();
  }, [map, isStyleLoaded]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e) => {
      if (!isDrawing) return;
      const coordinates = [e.lngLat.lng, e.lngLat.lat];
      setClickedPoints((prev) => [...prev, coordinates]);
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, isDrawing]);

  const drawRouteOnMap = (route) => {
    const sourceId = `route-${route.id}`;
    const coords = route.coordinates.map((coordStr) =>
      coordStr.split(',').map(Number)
    );

    const roadType = roadTypes.find((type) => type.value === route.type);

    if (map.getSource(sourceId)) {
      map.removeLayer(sourceId);
      map.removeSource(sourceId);
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      },
    });

    map.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': roadType?.color || '#000000',
        'line-width': roadType?.width || 5,
      },
    });
  };

  const loadRoutes = () => {
    const saved = localStorage.getItem('routes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRoutes(parsed);
        parsed.forEach((route) => drawRouteOnMap(route));
      } catch {
        setRoutes([]);
      }
    } else {
      setRoutes([]);
    }
  };

  const saveRoutesToStorage = (updatedRoutes) => {
    localStorage.setItem('routes', JSON.stringify(updatedRoutes));
    setRoutes(updatedRoutes);
  };

  const handleSaveRoute = () => {
    if (!routeName || clickedPoints.length < 2) {
      setError('Please provide a route name and at least 2 points');
      return;
    }

    const newRoute = {
      id: Date.now(),
      name: routeName,
      type: routeType,
      coordinates: clickedPoints.map((coord) => `${coord[0]},${coord[1]}`),
      createdAt: new Date().toISOString(),
    };

    const updatedRoutes = [...routes, newRoute];
    saveRoutesToStorage(updatedRoutes);
    drawRouteOnMap(newRoute);

    // Clear temp line
    const drawingSourceId = 'temp-route-line';
    if (map.getLayer(drawingSourceId)) {
      map.removeLayer(drawingSourceId);
    }
    if (map.getSource(drawingSourceId)) {
      map.removeSource(drawingSourceId);
    }

    setRouteName('');
    setClickedPoints([]);
    setIsDrawing(false);
    setError('');
    alert('Route saved successfully!');
  };

  const handleDeleteRoute = (id) => {
    const updatedRoutes = routes.filter((route) => route.id !== id);
    saveRoutesToStorage(updatedRoutes);

    const sourceId = `route-${id}`;
    if (map.getLayer(sourceId)) {
      map.removeLayer(sourceId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  };

  return (
    <div className="bg-gray-50 space-y-1">
      <h3 className="text-xl font-bold text-gray-800">Route Manager</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        value={routeName}
        onChange={(e) => setRouteName(e.target.value)}
        placeholder="Route name"
        className="w-full py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <select
        value={routeType}
        onChange={(e) => setRouteType(e.target.value)}
        className="w-full py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {roadTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          setIsDrawing(!isDrawing);
          if (!isDrawing) setClickedPoints([]);
        }}
        className={`w-full px-4 py-1 rounded-md text-white font-medium transition-all duration-150 ${
          isDrawing ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isDrawing ? 'Cancel Drawing' : 'Start Drawing'}
      </button>

      {isDrawing && clickedPoints.length >= 2 && (
        <button
          onClick={handleSaveRoute}
          className="w-full px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-all duration-150"
        >
          Save Route
        </button>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Routes List</h3>
        <div className="space-y-1">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-1 bg-gray-50 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="font-medium text-gray-900">{route.name}</div>
              <div className="text-sm text-gray-600 ">
                {roadTypes.find((type) => type.value === route.type)?.label || 'Major Road'}
              </div>
              <button
                onClick={() => handleDeleteRoute(route.id)}
                className="w-full px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-semibold transition-all"
              >
                Delete Route
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteManager;
