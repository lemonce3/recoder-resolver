import EventEmitter from 'eventemitter3';

const CLICK_EVENT = ['click', 'dblclick'];

const resolver = new EventEmitter();
const htmlParser = new DOMParser();

const clickStack = [];
const DEFAULT_DBLCLICK_INTERVAL = 1 * 1000;

let lastSnapshot = null;
let lastFrame = null;
let lastTarget = null;
let dblClickTimeoutID = null;

function emitAction(action) {
	resolver.emit('resolved-action', action)
}

function emitClick() {
	clickStack.forEach(clickAction => emitAction(clickAction));
	clickStack.length = 0;
}

function resetDblClickTimeout() {
	if (dblClickTimeoutID) {
		clearTimeout(dblClickTimeoutID);
	}

	dblClickTimeoutID = setTimeout(emitClick, DEFAULT_DBLCLICK_INTERVAL);
}

function parseClickAction(action) {console.log(action.snapshot === lastSnapshot.id);
	if (action.snapshot === lastSnapshot.id) {
		
		if (action.type === 'click') {
			resetDblClickTimeout();
			clickStack.push(action);
		}
		console.log(1);
		if (action.type === 'dblclick') {console.log(22);
			if (clickStack.length === 2) {
				clearTimeout(dblClickTimeoutID);
				clickStack.length = 0;
				emitAction(action);
			}
		}
	} else {
		clickStack.length = 0;
		emitAction(action);
	}
}

const getId = (length = 5) =>
		Array(length)
			.fill('')
			.map(() =>
				Math.random()
					.toString(16)
					.substring(2, 8)
			)
			.join('-');

function parseHTML(string) {
	return htmlParser.parseFromString(string, 'text/html');
}

function parseSnapshot(snapshot, hash = 'top') {
	const self = parseHTML(snapshot.self);
	const map = { self };

	const target = self.querySelector('[lc-target]');
	if (target) {
		lastFrame = hash;
		lastTarget = target;
	}

	Object.keys(snapshot.map).forEach(hash => map[hash] = parseSnapshot(snapshot.map[hash]), hash);

	return {
		id: getId(),
		map
	};
}

function parseAction(action) {console.log(lastSnapshot);
	const { rect, text } = action.data;

	const result = {
		id: getId(),
		screenshot: action.screenshot,
		type: action.type,
		snapshot: lastSnapshot.id,
		frame: lastFrame,
		element: {
			rect,
			text,
			tagName: lastTarget.tagName,
			attributes: {}
		}
	};

	if (lastTarget.type) {
		result.element.attributes.type = {
			name: 'type',
			value: lastTarget.type
		}
	}

	if (action.data.value) {
		result.element.value = {
			key: 'value',
			value: action.data.value
		};
	}

	Object.keys(lastTarget.attributes).forEach(index => {
		const attr = lastTarget.attributes[index];
		result.element.attributes[attr.name] = {
			name: attr.name,
			value: attr.value
		}
	});

	return result;
}

resolver.on('snapshot', snapshot => {
	lastSnapshot = parseSnapshot(snapshot);
});

resolver.on('action', action => {
	if (CLICK_EVENT.includes(action.type)) {
		parseClickAction(parseAction(action));
		return;
	}

	emitAction(parseAction(action));
});

resolver.on('end', () => {
	lastSnapshot = null;
	lastTarget = null;
});

export default resolver;