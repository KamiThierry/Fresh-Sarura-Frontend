const RWANDA_LOCATIONS = {
  provinces: [
    {
      id: 'kigali',
      name: 'Kigali City',
      districts: [
        {
          id: 'gasabo', name: 'Gasabo',
          coordinates: { lat: -1.9156, lng: 30.0878 },
          sectors: ['Bumbogo','Gatsata','Gikomero','Gisozi','Jabana','Jali','Kacyiru','Kimihurura','Kimisagara','Kinyinya','Ndera','Nduba','Remera','Rusororo','Rutunga']
        },
        {
          id: 'kicukiro', name: 'Kicukiro',
          coordinates: { lat: -1.9659, lng: 30.1032 },
          sectors: ['Gahanga','Gatenga','Gikondo','Kagarama','Kanombe','Kicukiro','Masaka','Niboye','Nyarugunga']
        },
        {
          id: 'nyarugenge', name: 'Nyarugenge',
          coordinates: { lat: -1.9441, lng: 30.0619 },
          sectors: ['Gitega','Kanyinya','Kigali','Kimisagara','Mageragere','Muhima','Nyakabanda','Nyamirambo','Nyarugenge','Rwezamenyo']
        }
      ]
    },
    {
      id: 'eastern',
      name: 'Eastern Province',
      districts: [
        {
          id: 'bugesera', name: 'Bugesera',
          coordinates: { lat: -2.2167, lng: 30.2833 },
          sectors: ['Gashora','Juru','Kamabuye','Ntarama','Nyamata','Nyarugenge','Rilima','Ruhuha','Rweru']
        },
        {
          id: 'gatsibo', name: 'Gatsibo',
          coordinates: { lat: -1.5833, lng: 30.4167 },
          sectors: ['Gatsibo','Gitoki','Kabarore','Kageyo','Kiramuruzi','Kiziguro','Muhura','Murambi','Ngarama','Nyagihanga','Remera','Rugarama','Rwimbogo']
        },
        {
          id: 'kayonza', name: 'Kayonza',
          coordinates: { lat: -1.8833, lng: 30.6167 },
          sectors: ['Gahini','Kabare','Mukarange','Murama','Murundi','Ndego','Nyamirama','Rukara','Ruramira','Rwinkwavu']
        },
        {
          id: 'kirehe', name: 'Kirehe',
          coordinates: { lat: -2.2167, lng: 30.7833 },
          sectors: ['Gatore','Jarama','Kigarama','Kirehe','Mahama','Mpanga','Mushikiri','Nasho','Nyamugari','Nyarubuye']
        },
        {
          id: 'ngoma', name: 'Ngoma',
          coordinates: { lat: -2.1500, lng: 30.5833 },
          sectors: ['Gashanda','Jarama','Karembo','Kibungo','Mugesera','Murama','Remera','Rukira','Rukumberi','Sake','Zaza']
        },
        {
          id: 'nyagatare', name: 'Nyagatare',
          coordinates: { lat: -1.2938, lng: 30.3275 },
          sectors: ['Gatunda','Karangazi','Katabagemu','Kiyombe','Matimba','Mimuli','Mukama','Musheri','Nyagatare','Rukomo','Rwimiyaga','Tabagwe']
        },
        {
          id: 'rwamagana', name: 'Rwamagana',
          coordinates: { lat: -1.9500, lng: 30.4333 },
          sectors: ['Fumbwe','Gahengeri','Gishari','Karenge','Kigabiro','Muhazi','Munyaga','Munyiginya','Musha','Nzige','Nyakariro','Rubona','Rurenge','Rwamagana']
        }
      ]
    },
    {
      id: 'northern',
      name: 'Northern Province',
      districts: [
        {
          id: 'burera', name: 'Burera',
          coordinates: { lat: -1.4667, lng: 29.8833 },
          sectors: ['Bungwe','Butaro','Cyanika','Cyeru','Gahunga','Gatebe','Gitovu','Kagogo','Kinoni','Kinyababa','Kivuye','Nemba','Rugarama','Rugendabari','Ruhunde','Rusarabuye','Rwerere']
        },
        {
          id: 'gakenke', name: 'Gakenke',
          coordinates: { lat: -1.6833, lng: 29.7833 },
          sectors: ['Busengo','Coko','Cyabingo','Gakenke','Gashenyi','Mugunga','Janja','Kamubuga','Karambo','Kivuruga','Mataba','Minazi','Muhondo','Muyongwe','Muzo','Nemba','Ruli','Rusasa','Rushashi']
        },
        {
          id: 'gicumbi', name: 'Gicumbi',
          coordinates: { lat: -1.5500, lng: 30.1833 },
          sectors: ['Bukure','Bwisige','Byumba','Cyumba','Gicumbi','Kaniga','Manyagiro','Miyove','Mukure','Mutete','Nyamiyaga','Nyankenke','Rubaya','Rukomo','Rushaki','Rutare','Ruvune','Rwamiko','Shangasha']
        },
        {
          id: 'musanze', name: 'Musanze',
          coordinates: { lat: -1.4995, lng: 29.6335 },
          sectors: ['Busogo','Cyuve','Gacaca','Gashaki','Gataraga','Kimonyi','Kinigi','Muhoza','Muko','Musanze','Nkotsi','Nyange','Remera','Rwaza','Shingiro']
        },
        {
          id: 'rulindo', name: 'Rulindo',
          coordinates: { lat: -1.7667, lng: 30.0667 },
          sectors: ['Base','Burega','Bushoki','Cyinzuzi','Cyungo','Kinihira','Kisaro','Mbogo','Murambi','Ngoma','Ntarabana','Rukozo','Rusiga','Shyorongi','Tumba']
        }
      ]
    },
    {
      id: 'southern',
      name: 'Southern Province',
      districts: [
        {
          id: 'gisagara', name: 'Gisagara',
          coordinates: { lat: -2.5500, lng: 29.8500 },
          sectors: ['Gishubi','Kansi','Kibirizi','Kigembe','Muganza','Mugombwa','Mukindo','Ndora','Nyanza','Rweru','Save']
        },
        {
          id: 'huye', name: 'Huye',
          coordinates: { lat: -2.6399, lng: 29.7406 },
          sectors: ['Gishamvu','Karama','Kigoma','Kinazi','Maraba','Mbazi','Mukura','Ngoma','Ruhashya','Rusatira','Rwaniro','Simbi','Tumba']
        },
        {
          id: 'kamonyi', name: 'Kamonyi',
          coordinates: { lat: -2.0667, lng: 29.8833 },
          sectors: ['Gacurabwenge','Karama','Kayenzi','Kayumbu','Mugina','Musambira','Nyamiyaga','Nyarubaka','Runda','Ruzo']
        },
        {
          id: 'muhanga', name: 'Muhanga',
          coordinates: { lat: -2.0833, lng: 29.7500 },
          sectors: ['Cyeza','Gitarama','Kabacuzi','Kamonyi','Kiyumba','Muhanga','Mukura','Nyabinoni','Nyamabuye','Nyarubaka','Rongi','Rugendabari']
        },
        {
          id: 'nyamagabe', name: 'Nyamagabe',
          coordinates: { lat: -2.5167, lng: 29.4167 },
          sectors: ['Buruhukiro','Cyanika','Gasaka','Gatare','Kaduha','Kamegeri','Kibago','Kitabi','Mbazi','Mushubi','Musange','Nkomane','Tare','Uwinkingi']
        },
        {
          id: 'nyanza', name: 'Nyanza',
          coordinates: { lat: -2.3500, lng: 29.7500 },
          sectors: ['Busasamana','Busoro','Cyabakamyi','Kibirizi','Kigoma','Mukingo','Muyira','Ntyazo','Nyagisozi','Rwabicuma']
        },
        {
          id: 'nyaruguru', name: 'Nyaruguru',
          coordinates: { lat: -2.7000, lng: 29.5500 },
          sectors: ['Busanze','Cyahinda','Kibeho','Kibumbwe','Kivu','Mata','Munini','Ngera','Ngoma','Nyabimata','Ruramba','Rusenge','Ryamanyonza']
        },
        {
          id: 'ruhango', name: 'Ruhango',
          coordinates: { lat: -2.2833, lng: 29.7833 },
          sectors: ['Bweramana','Byimana','Kabagali','Kinazi','Kinihira','Mbuye','Ntongwe','Ruhango']
        }
      ]
    },
    {
      id: 'western',
      name: 'Western Province',
      districts: [
        {
          id: 'karongi', name: 'Karongi',
          coordinates: { lat: -1.9500, lng: 29.3833 },
          sectors: ['Bwishyura','Gashari','Gitesi','Gishyita','Gisovu','Kivumu','Mahembe','Murambi','Murundi','Mutuntu','Rugabano','Ruganda','Rwankuba']
        },
        {
          id: 'ngororero', name: 'Ngororero',
          coordinates: { lat: -1.7833, lng: 29.5333 },
          sectors: ['Bwira','Gasiza','Hindiro','Kabaya','Kageyo','Kavumu','Matyazo','Muhanda','Muhororo','Ndaro','Ngororero','Nyange','Sovu']
        },
        {
          id: 'nyabihu', name: 'Nyabihu',
          coordinates: { lat: -1.6500, lng: 29.5167 },
          sectors: ['Bigogwe','Jenda','Jomba','Kabatwa','Karago','Kintobo','Mukamira','Nyabihu','Rurembo','Ruyanza','Shyira']
        },
        {
          id: 'nyamasheke', name: 'Nyamasheke',
          coordinates: { lat: -2.2167, lng: 29.1500 },
          sectors: ['Bushekeri','Bushenge','Cyato','Gihombo','Kagano','Kanjongo','Karambi','Karengera','Kirimbi','Macuba','Mahembe','Makoma','Rangiro','Ruharambuga']
        },
        {
          id: 'rubavu', name: 'Rubavu',
          coordinates: { lat: -1.6777, lng: 29.2505 },
          sectors: ['Bugeshi','Busasamana','Cyanzarwe','Gisenyi','Kanama','Kanzenze','Mudende','Nyakiliba','Nyakiriba','Nyundo','Rubavu','Rugerero']
        },
        {
          id: 'rusizi', name: 'Rusizi',
          coordinates: { lat: -2.4833, lng: 28.9167 },
          sectors: ['Butare','Bugarama','Gashonga','Giheke','Gihundwe','Gitambi','Gikundamvura','Kamembe','Muganza','Mururu','Nkanka','Nkungu','Nyakabuye','Nyakarenzo','Ruganda','Rwimbogo']
        },
        {
          id: 'rutsiro', name: 'Rutsiro',
          coordinates: { lat: -1.9167, lng: 29.4833 },
          sectors: ['Boneza','Gihango','Kigeyo','Kivumu','Manihira','Mukura','Murunda','Musasa','Mushonyi','Mushubati','Nyabirasi','Ruhango','Rusebeya']
        }
      ]
    }
  ]
};

export const getProvinces = () =>
  RWANDA_LOCATIONS.provinces.map(p => ({ value: p.id, label: p.name }));

export const getDistricts = (provinceId: string) => {
  const province = RWANDA_LOCATIONS.provinces.find(p => p.id === provinceId);
  if (!province) return [];
  return province.districts.map(d => ({ value: d.id, label: d.name }));
};

export const getSectors = (provinceId: string, districtId: string) => {
  const province = RWANDA_LOCATIONS.provinces.find(p => p.id === provinceId);
  if (!province) return [];
  const district = province.districts.find(d => d.id === districtId);
  if (!district) return [];
  return district.sectors.map(s => ({ value: s.toLowerCase().replace(/\s+/g, '_'), label: s }));
};

/** Returns real GPS coordinates for a given district.
 *  If provinceId is missing or not matched, falls back to searching all provinces. */
export const getDistrictCoordinates = (provinceId: string, districtId: string) => {
  const fallback = { lat: -1.9403, lng: 29.8739 };
  if (!districtId) return fallback;

  // If province provided, search within it first (fast path)
  if (provinceId) {
    const province = RWANDA_LOCATIONS.provinces.find(p => p.id === provinceId);
    if (province) {
      const district = province.districts.find(d => d.id === districtId);
      if (district?.coordinates) return district.coordinates;
    }
  }

  // Fallback: search ALL provinces (handles missing province field)
  for (const province of RWANDA_LOCATIONS.provinces) {
    const district = province.districts.find(d => d.id === districtId);
    if (district?.coordinates) return district.coordinates;
  }

  return fallback;
};

export const getAllDistricts = () => {
  const districts: { value: string; label: string }[] = [];
  RWANDA_LOCATIONS.provinces.forEach(province => {
    province.districts.forEach(district => {
      districts.push({ value: district.id, label: `${district.name} (${province.name})` });
    });
  });
  return districts;
};
