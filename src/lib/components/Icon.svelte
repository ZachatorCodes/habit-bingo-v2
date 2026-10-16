<script lang="ts">
	import type { Component } from 'svelte';
	import { FALLBACK_ICON, isIconName, type IconName } from '#lib/icons.ts';
	import Barbell from 'phosphor-svelte/lib/Barbell';
	import PersonSimpleRun from 'phosphor-svelte/lib/PersonSimpleRun';
	import Bicycle from 'phosphor-svelte/lib/Bicycle';
	import SwimmingPool from 'phosphor-svelte/lib/SwimmingPool';
	import SneakerMove from 'phosphor-svelte/lib/SneakerMove';
	import Mountains from 'phosphor-svelte/lib/Mountains';
	import SoccerBall from 'phosphor-svelte/lib/SoccerBall';
	import Basketball from 'phosphor-svelte/lib/Basketball';
	import Drop from 'phosphor-svelte/lib/Drop';
	import Carrot from 'phosphor-svelte/lib/Carrot';
	import Pill from 'phosphor-svelte/lib/Pill';
	import Tooth from 'phosphor-svelte/lib/Tooth';
	import Bed from 'phosphor-svelte/lib/Bed';
	import Moon from 'phosphor-svelte/lib/Moon';
	import Wine from 'phosphor-svelte/lib/Wine';
	import Cigarette from 'phosphor-svelte/lib/Cigarette';
	import Coffee from 'phosphor-svelte/lib/Coffee';
	import ForkKnife from 'phosphor-svelte/lib/ForkKnife';
	import Hamburger from 'phosphor-svelte/lib/Hamburger';
	import Heartbeat from 'phosphor-svelte/lib/Heartbeat';
	import Leaf from 'phosphor-svelte/lib/Leaf';
	import Brain from 'phosphor-svelte/lib/Brain';
	import FlowerLotus from 'phosphor-svelte/lib/FlowerLotus';
	import SunHorizon from 'phosphor-svelte/lib/SunHorizon';
	import Smiley from 'phosphor-svelte/lib/Smiley';
	import Notebook from 'phosphor-svelte/lib/Notebook';
	import Sun from 'phosphor-svelte/lib/Sun';
	import Broom from 'phosphor-svelte/lib/Broom';
	import Sparkle from 'phosphor-svelte/lib/Sparkle';
	import Cat from 'phosphor-svelte/lib/Cat';
	import Dog from 'phosphor-svelte/lib/Dog';
	import Plant from 'phosphor-svelte/lib/Plant';
	import WashingMachine from 'phosphor-svelte/lib/WashingMachine';
	import Trash from 'phosphor-svelte/lib/Trash';
	import House from 'phosphor-svelte/lib/House';
	import Phone from 'phosphor-svelte/lib/Phone';
	import UsersThree from 'phosphor-svelte/lib/UsersThree';
	import ChatCircle from 'phosphor-svelte/lib/ChatCircle';
	import Envelope from 'phosphor-svelte/lib/Envelope';
	import Heart from 'phosphor-svelte/lib/Heart';
	import Gift from 'phosphor-svelte/lib/Gift';
	import BookOpen from 'phosphor-svelte/lib/BookOpen';
	import GraduationCap from 'phosphor-svelte/lib/GraduationCap';
	import Translate from 'phosphor-svelte/lib/Translate';
	import Code from 'phosphor-svelte/lib/Code';
	import PencilSimple from 'phosphor-svelte/lib/PencilSimple';
	import Lightbulb from 'phosphor-svelte/lib/Lightbulb';
	import PaintBrush from 'phosphor-svelte/lib/PaintBrush';
	import MusicNotes from 'phosphor-svelte/lib/MusicNotes';
	import Camera from 'phosphor-svelte/lib/Camera';
	import Guitar from 'phosphor-svelte/lib/Guitar';
	import Palette from 'phosphor-svelte/lib/Palette';
	import PenNib from 'phosphor-svelte/lib/PenNib';
	import PiggyBank from 'phosphor-svelte/lib/PiggyBank';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import Coins from 'phosphor-svelte/lib/Coins';
	import ShoppingCart from 'phosphor-svelte/lib/ShoppingCart';
	import Receipt from 'phosphor-svelte/lib/Receipt';
	import ChartLineUp from 'phosphor-svelte/lib/ChartLineUp';
	import Star from 'phosphor-svelte/lib/Star';
	import Alarm from 'phosphor-svelte/lib/Alarm';
	import Target from 'phosphor-svelte/lib/Target';
	import Trophy from 'phosphor-svelte/lib/Trophy';
	import Rocket from 'phosphor-svelte/lib/Rocket';
	import Cactus from 'phosphor-svelte/lib/Cactus';
	import Flower from 'phosphor-svelte/lib/Flower';
	import Pizza from 'phosphor-svelte/lib/Pizza';
	import Lock from 'phosphor-svelte/lib/Lock';
	import GridNine from 'phosphor-svelte/lib/GridNine';
	import UserCircle from 'phosphor-svelte/lib/UserCircle';
	import ShieldCheck from 'phosphor-svelte/lib/ShieldCheck';

	type IconProps = {
		weight?: Props['weight'];
		size?: Props['size'];
		class?: string;
		'aria-hidden'?: 'true';
	};

	type Props = {
		name: string;
		weight?: 'regular' | 'duotone' | 'fill' | 'bold';
		size?: number | string;
		class?: string;
	};
	let { name, weight = 'duotone', size = '1em', class: className }: Props = $props();

	// Static map so only the curated icons are bundled.
	const COMPONENTS: Record<IconName, Component<IconProps>> = {
		barbell: Barbell,
		'person-simple-run': PersonSimpleRun,
		bicycle: Bicycle,
		'swimming-pool': SwimmingPool,
		'sneaker-move': SneakerMove,
		mountains: Mountains,
		'soccer-ball': SoccerBall,
		basketball: Basketball,
		drop: Drop,
		carrot: Carrot,
		pill: Pill,
		tooth: Tooth,
		bed: Bed,
		moon: Moon,
		wine: Wine,
		cigarette: Cigarette,
		coffee: Coffee,
		'fork-knife': ForkKnife,
		hamburger: Hamburger,
		heartbeat: Heartbeat,
		leaf: Leaf,
		brain: Brain,
		'flower-lotus': FlowerLotus,
		'sun-horizon': SunHorizon,
		smiley: Smiley,
		notebook: Notebook,
		sun: Sun,
		broom: Broom,
		sparkle: Sparkle,
		cat: Cat,
		dog: Dog,
		plant: Plant,
		'washing-machine': WashingMachine,
		trash: Trash,
		house: House,
		phone: Phone,
		'users-three': UsersThree,
		'chat-circle': ChatCircle,
		envelope: Envelope,
		heart: Heart,
		gift: Gift,
		'book-open': BookOpen,
		'graduation-cap': GraduationCap,
		translate: Translate,
		code: Code,
		'pencil-simple': PencilSimple,
		lightbulb: Lightbulb,
		'paint-brush': PaintBrush,
		'music-notes': MusicNotes,
		camera: Camera,
		guitar: Guitar,
		palette: Palette,
		'pen-nib': PenNib,
		'piggy-bank': PiggyBank,
		wallet: Wallet,
		coins: Coins,
		'shopping-cart': ShoppingCart,
		receipt: Receipt,
		'chart-line-up': ChartLineUp,
		star: Star,
		alarm: Alarm,
		target: Target,
		trophy: Trophy,
		rocket: Rocket,
		cactus: Cactus,
		flower: Flower,
		pizza: Pizza,
		'grid-nine': GridNine,
		'user-circle': UserCircle,
		'shield-check': ShieldCheck,
		lock: Lock
	};

	const Glyph = $derived(COMPONENTS[isIconName(name) ? name : FALLBACK_ICON]);
</script>

<Glyph {weight} {size} class={className} aria-hidden="true" />
