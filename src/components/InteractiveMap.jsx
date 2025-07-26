import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Truck, 
  Building, 
  Navigation, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut,
  Locate,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        color: white;
        font-size: 16px;
      ">
        ${icon}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

const branchIcon = createCustomIcon('#ef4444', '🏢');
const truckAvailableIcon = createCustomIcon('#22c55e', '🚛');
const truckBusyIcon = createCustomIcon('#f59e0b', '🚛');
const truckOfflineIcon = createCustomIcon('#6b7280', '🚛');
const pickupIcon = createCustomIcon('#3b82f6', '📍');
const userLocationIcon = createCustomIcon('#8b5cf6', '👤');

// Map controller component
const MapController = ({ center, zoom, onLocationFound }) => {
  const map = useMap();

  const handleLocateUser = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  useEffect(() => {
    map.on('locationfound', (e) => {
      onLocationFound(e.latlng);
    });

    return () => {
      map.off('locationfound');
    };
  }, [map, onLocationFound]);

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <Button
          onClick={handleLocateUser}
          className="bg-white hover:bg-gray-50 text-gray-700 border-none shadow-lg"
          size="sm"
        >
          <Locate className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const InteractiveMap = ({ 
  height = 600, 
  showControls = true, 
  initialCenter = [-1.2921, 36.8219], // Nairobi
  initialZoom = 12,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { user } = useAuth();
  const [mapData, setMapData] = useState({
    branches: [],
    trucks: [],
    pickupRequests: [],
    userLocation: null
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filters, setFilters] = useState({
    showBranches: true,
    showTrucks: true,
    showPickups: true,
    showAvailableTrucks: true,
    showBusyTrucks: true,
    showOfflineTrucks: true
  });
  const [selectedBranch, setSelectedBranch] = useState(null);
  const refreshIntervalRef = useRef(null);

  // Load map data
  const loadMapData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load branches, trucks, and pickup requests in parallel
      const [branchesResponse, trucksResponse, pickupsResponse] = await Promise.all([
        apiService.getBranches(),
        apiService.getTrucks(),
        apiService.getPickupRequests()
      ]);

      const newMapData = {
        branches: branchesResponse.success ? branchesResponse.data : [],
        trucks: trucksResponse.success ? trucksResponse.data : [],
        pickupRequests: pickupsResponse.success ? pickupsResponse.data : [],
        userLocation: mapData.userLocation
      };

      setMapData(newMapData);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user location
  const handleLocationFound = (latlng) => {
    setMapData(prev => ({
      ...prev,
      userLocation: latlng
    }));
  };

  // Auto-refresh functionality
  useEffect(() => {
    loadMapData();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadMapData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, autoRefresh, refreshInterval]);

  // Filter trucks based on status
  const getFilteredTrucks = () => {
    return mapData.trucks.filter(truck => {
      if (!filters.showTrucks) return false;
      
      switch (truck.status) {
        case 'available':
          return filters.showAvailableTrucks;
        case 'dispatched':
        case 'en-route':
        case 'at-location':
          return filters.showBusyTrucks;
        case 'offline':
        case 'maintenance':
          return filters.showOfflineTrucks;
        default:
          return true;
      }
    });
  };

  // Get truck icon based on status
  const getTruckIcon = (status) => {
    switch (status) {
      case 'available':
        return truckAvailableIcon;
      case 'dispatched':
      case 'en-route':
      case 'at-location':
        return truckBusyIcon;
      case 'offline':
      case 'maintenance':
        return truckOfflineIcon;
      default:
        return truckAvailableIcon;
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'dispatched':
      case 'en-route':
        return 'bg-yellow-500';
      case 'at-location':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-purple-500';
      case 'maintenance':
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Map Controls */}
      {showControls && (
        <Card className="bg-black/50 border-red-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                Fleet Map
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={loadMapData}
                  disabled={loading}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Badge variant="outline" className="text-gray-300">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Layer Controls */}
              <div className="space-y-2">
                <Label className="text-white font-medium">Layers</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-branches"
                      checked={filters.showBranches}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showBranches: checked }))
                      }
                    />
                    <Label htmlFor="show-branches" className="text-sm text-gray-300">
                      Branches ({mapData.branches.length})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-trucks"
                      checked={filters.showTrucks}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showTrucks: checked }))
                      }
                    />
                    <Label htmlFor="show-trucks" className="text-sm text-gray-300">
                      Trucks ({mapData.trucks.length})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-pickups"
                      checked={filters.showPickups}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showPickups: checked }))
                      }
                    />
                    <Label htmlFor="show-pickups" className="text-sm text-gray-300">
                      Pickups ({mapData.pickupRequests.length})
                    </Label>
                  </div>
                </div>
              </div>

              {/* Truck Status Filters */}
              <div className="space-y-2">
                <Label className="text-white font-medium">Truck Status</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-available"
                      checked={filters.showAvailableTrucks}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showAvailableTrucks: checked }))
                      }
                    />
                    <Label htmlFor="show-available" className="text-sm text-green-400">
                      Available
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-busy"
                      checked={filters.showBusyTrucks}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showBusyTrucks: checked }))
                      }
                    />
                    <Label htmlFor="show-busy" className="text-sm text-yellow-400">
                      Busy
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-offline"
                      checked={filters.showOfflineTrucks}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ ...prev, showOfflineTrucks: checked }))
                      }
                    />
                    <Label htmlFor="show-offline" className="text-sm text-gray-400">
                      Offline
                    </Label>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-2">
                <Label className="text-white font-medium">Statistics</Label>
                <div className="space-y-1 text-sm text-gray-300">
                  <div>Total Branches: {mapData.branches.length}</div>
                  <div>Active Trucks: {mapData.trucks.filter(t => t.status === 'available').length}</div>
                  <div>Busy Trucks: {mapData.trucks.filter(t => ['dispatched', 'en-route', 'at-location'].includes(t.status)).length}</div>
                  <div>Pending Pickups: {mapData.pickupRequests.filter(p => p.status === 'pending').length}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <Label className="text-white font-medium">Legend</Label>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    Branches
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Available Trucks
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    Busy Trucks
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Pickup Points
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      <Card className="bg-black/50 border-red-900/30">
        <CardContent className="p-0">
          <div style={{ height: `${height}px` }} className="relative">
            <MapContainer
              center={initialCenter}
              zoom={initialZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapController 
                center={initialCenter} 
                zoom={initialZoom}
                onLocationFound={handleLocationFound}
              />

              {/* Branch Markers */}
              {filters.showBranches && mapData.branches.map(branch => (
                branch.location?.coordinates?.latitude && branch.location?.coordinates?.longitude && (
                  <Marker
                    key={branch._id}
                    position={[branch.location.coordinates.latitude, branch.location.coordinates.longitude]}
                    icon={branchIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">{branch.name}</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Code:</strong> {branch.code}</p>
                          <p><strong>Address:</strong> {branch.location.address}</p>
                          <p><strong>Phone:</strong> {branch.contact?.phone}</p>
                          <p><strong>Assigned Trucks:</strong> {branch.assignedTrucks?.length || 0}</p>
                          <p><strong>Staff:</strong> {branch.staff?.filter(s => s.isActive).length || 0}</p>
                          {branch.workingHours && (
                            <p><strong>Status:</strong> 
                              <Badge className={`ml-1 ${branch.isOpenNow?.() ? 'bg-green-500' : 'bg-red-500'}`}>
                                {branch.isOpenNow?.() ? 'Open' : 'Closed'}
                              </Badge>
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Truck Markers */}
              {getFilteredTrucks().map(truck => (
                truck.currentLocation?.latitude && truck.currentLocation?.longitude && (
                  <Marker
                    key={truck._id}
                    position={[truck.currentLocation.latitude, truck.currentLocation.longitude]}
                    icon={getTruckIcon(truck.status)}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">Truck {truck.truckId}</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Driver:</strong> {truck.driver?.name}</p>
                          <p><strong>Phone:</strong> {truck.driver?.phone}</p>
                          <p><strong>License Plate:</strong> {truck.vehicle?.licensePlate}</p>
                          <p><strong>Status:</strong> 
                            <Badge className={`ml-1 ${getStatusBadgeColor(truck.status)}`}>
                              {truck.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                          </p>
                          <p><strong>Branch:</strong> {truck.assignedBranch?.name || 'Unassigned'}</p>
                          <p><strong>Last Seen:</strong> {new Date(truck.lastSeen).toLocaleString()}</p>
                          {truck.assignedRequest && (
                            <p><strong>Current Job:</strong> {truck.assignedRequest.userName}</p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Pickup Request Markers */}
              {filters.showPickups && mapData.pickupRequests.map(pickup => (
                pickup.pickupLocation?.latitude && pickup.pickupLocation?.longitude && (
                  <Marker
                    key={pickup._id}
                    position={[pickup.pickupLocation.latitude, pickup.pickupLocation.longitude]}
                    icon={pickupIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">Pickup Request</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Customer:</strong> {pickup.userName}</p>
                          <p><strong>Phone:</strong> {pickup.userPhone}</p>
                          <p><strong>Vehicle:</strong> {pickup.vehicleDetails}</p>
                          <p><strong>Status:</strong> 
                            <Badge className={`ml-1 ${getStatusBadgeColor(pickup.status)}`}>
                              {pickup.status.toUpperCase()}
                            </Badge>
                          </p>
                          <p><strong>Requested:</strong> {new Date(pickup.requestTime).toLocaleString()}</p>
                          {pickup.assignedTruck && (
                            <p><strong>Assigned Truck:</strong> {pickup.assignedTruck.truckId}</p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* User Location Marker */}
              {mapData.userLocation && (
                <Marker
                  position={[mapData.userLocation.lat, mapData.userLocation.lng]}
                  icon={userLocationIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">Your Location</h3>
                      <p className="text-sm">Current GPS position</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveMap;