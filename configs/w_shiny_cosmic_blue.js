export const MODEL_CONFIG = {
  name: 'Cosmic_blue',
  
  glb: './models/Standard_Wayfarer.glb',

    frame: {
		baseColor: [0.015, 0.015, 0.03],
		roughness: 0.35,
		metalness: 0.1
	},

	armsText: {
		overlay: './textures/Temples_wayfarer_standard_2k.png',
		color: [0.04, 0.04, 0.09]
	},

	glass: {
		color: [0.05, 0.06, 0.10],
		roughness: 0.1,
		metalness: 0.5,
		opacity: 0.9, 
		
		animate: true,
		gradient: false,
		animateCamera: 'Cam_Lenses'
	},

	logo: {
	  texture: './textures/Standard_alpha.jpg',
	  emissiveIntensity: 0.6
	},

	startCamera: 'Cam_Front',
	freeCamera: 'Cam_Free'
	
};
