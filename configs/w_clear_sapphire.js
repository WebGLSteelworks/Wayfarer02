export const MODEL_CONFIG = {
  name: 'Clear_Sapphire',
  
  glb: './models/Standard_Wayfarer.glb',

	frame: {
	  baseColor: [0.02, 0.02, 0.02],
	  roughness: 0.1,
	  metalness: 0.0,
	  trans: true,          
	  opacity: 0.3, 
	  reflectivity: 1.0 			
	},

	armsText: {
		overlay: './textures/Temples_wayfarer_standard_2k.png',
		color: [0.5, 0.5, 0.5]
	},

	glass: {
		color: [0.025, 0.03, 0.04],
		roughness: 0.1,
		metalness: 0.5,
		opacity: 0.9, 
		
		animate: true,
		gradient: false,
		animateCamera: 'Cam_Lenses'
	},

	fake: {
	  texture: './textures/w_interior_fake.jpg'
	},

	logo: {
	  texture: './textures/Standard_alpha_clear.jpg',
	  emissiveIntensity: 0.6
	},

	startCamera: 'Cam_Front',
	freeCamera: 'Cam_Free'
	
};
