import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    loadRoutes();
  }, []);

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

  const loadRoutes = async () => {
    try {
      console.log('Fetching routes...');
      const response = await axios.get('http://localhost:8080/api/routes');
      console.log('Routes loaded:', response.data);
      setRoutes(response.data);
    } catch (error) {
      console.error('Load routes error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setError('Failed to load routes');
    }
  };

  const handleSaveRoute = async () => {
    if (!routeName || clickedPoints.length < 2) {
      setError('Please provide a route name and at least 2 points');
      return;
    }
  
    try {
      // Format coordinates as individual strings in the format "lng,lat"
      const routeData = {
        name: routeName,
        type: routeType,
        coordinates: clickedPoints.map(coord => `${coord[0]},${coord[1]}`), // Explicit formatting
        createdAt: new Date().toISOString()
      };
  
      console.log('Sending route data:', routeData); // Add this for debugging
      
      const response = await axios.post('http://localhost:8080/api/routes', routeData);
      console.log('Server response:', response.data);
  
      // Clear the drawing
      const drawingSourceId = 'temp-route-line';
      if (map.getLayer(drawingSourceId)) {
        map.removeLayer(drawingSourceId);
      }
      if (map.getSource(drawingSourceId)) {
        map.removeSource(drawingSourceId);
      }
  
      // Reset state
      setRouteName('');
      setClickedPoints([]);
      setIsDrawing(false);
      setError('');
      
      // Show success message
      alert('Route saved successfully!');
      
      // Reload routes
      await loadRoutes();
    } catch (error) {
      console.error('Save route error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        coordinates: clickedPoints // Log the original coordinates
      });
      
      setError(error.response?.data?.message || 'Failed to save route. Please try again.');
    }
  };
  const handleDeleteRoute = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/routes/${id}`);
      const sourceId = `route-${id}`;
      if (map.getLayer(sourceId)) {
        map.removeLayer(sourceId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      await loadRoutes();
      setError('');
    } catch (error) {
      console.error('Failed to delete route:', error);
      setError('Failed to delete route');
    }
  };

  // ... rest of your existing useEffect hooks for drawing routes ...

  return (
    <div className="w-[280px] bg-gray-100 p-4 space-y-4 overflow-y-auto h-[45%] rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold">Routes</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="Route name"
          className="w-full p-2 mb-2 border border-gray-300 rounded"
        />

        <select
          value={routeType}
          onChange={(e) => setRouteType(e.target.value)}
          className="w-full p-2 mb-2 border border-gray-300 rounded"
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
            if (!isDrawing) {
              setClickedPoints([]);
            }
          }}
          className={`w-full p-2 mb-2 rounded text-white ${
            isDrawing ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {isDrawing ? 'Cancel Drawing' : 'Start Drawing'}
        </button>

        {isDrawing && clickedPoints.length >= 2 && (
          <button
            onClick={handleSaveRoute}
            className="w-full p-2 mb-2 bg-blue-500 text-white rounded"
          >
            Save Route
          </button>
        )}
      </div>

      <h3 className="text-lg font-semibold">Routes List</h3>
      <div className="space-y-2">
        {routes.map((route) => (
          <div
            key={route.id}
            className="p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
          >
            <strong>{route.name}</strong>
            <div className="text-sm text-gray-600">
              {roadTypes.find((type) => type.value === route.type)?.label || 'Major Road'}
            </div>
            <button
              onClick={() => handleDeleteRoute(route.id)}
              className="w-full p-2 mt-2 bg-red-500 text-white rounded"
            >
              Delete Route
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteManager;