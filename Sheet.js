
function Field (origin = new p5.Vector(0, 0), size = new p5.Vector(600, 200)) {
	this.origin = origin;
	this.size = size;
}
//map from rectangle a, b to the rectangle of the Field
Field.prototype.to_pixels = function (x, y, a = new p5.Vector(0, 0), b = new p5.Vector(1, 1)) {
	return new p5.Vector(
		map(x, a.x, b.x, this.origin.x, this.origin.x + this.size.x),
		map(y, a.y, b.y, this.origin.y, this.origin.y + this.size.y),
	);
}
Field.prototype.map = Field.prototype.to_pixels;

function Sheet() {
	//pitches in half-tones:
	//0 = C0
	//48 = C4 = c'
	//57 = A4 = a' = 440Hz
	this.notes = [];

	//index into this.notes, usually pointing after the last note (to this.note.length),
	//can be moved back and forth with arrow keys
	this.current_note = 0;
	//after how many notes in between must a # be written again (natural after sharp is written as long as the sharp note is still drawn)
	this.threshhold_sharp_redraw = 3;

	this.allow_repeat = false;

	this.accepted_notes = [0, 1, 2, 4, 5, 6, 7, 9, 11, 12];
	this.natural_notes = [0, 2, 4, 5, 7, 9, 11, 12];
	this.drawn_lines = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
	this.length = 12; //how many notes → dividing lengthwise
	this.height = 48; //how many distinct notes → dividing height on plot
	this.lines = 15; //how many classical note lines
	this.show = {
		"plot": new Field(new p5.Vector(10, 10), new p5.Vector(600, 400)),
		"sheet": new Field(new p5.Vector(10, 10), new p5.Vector(600, 200)),
	}
	this.when_full = "step"; //alternative: "jump"

	this.synth = new p5.MonoSynth();
	this.volume = 1;
	this.delay = 1;
	this.duration = 1;
	this.transpose = 0;

	this.read_transpose();
	this.read_delay();
	this.read_duration();
	this.read_volume();
	this.write_accepted();
}
//returns {"octave": …, "line": …, "sharp": …}, so that 12 * octave + this.accepted_notes[line] + sharp == note
Sheet.prototype.to_C_major = function (note) {
	let octave = 0;
	while (note >= 12) {
		note -= 12;
		octave += 1;
	}
	while (note < 0) {
		note += 12;
		octave -= 1;
	}

	for (let a = 0; a < this.natural_notes.length; a++) {
		if (this.natural_notes[a] >= note) {
			sharp = (this.natural_notes[a] > note);
			if (sharp && a == 0) {
				//when the note 0 (C) ans possibly its successors
				//are not natural natural notes for some reasons,
				//write as a sharp note of the next octave lower
				octave -= 1;
				a += 12;
			}
			return {
				"octave": octave,
				"line": a - sharp,
				"sharp": note - this.natural_notes[a - sharp],
			};
		}
	}
	console.log("note", note, "in octave", octave, "could not be sorted");
	return null;
}
Sheet.prototype.get_note_code = function (note) {
	in_C = this.to_C_major(note);
	note_name = ["C", "D", "E", "F", "G", "A", "B"][in_C["line"]];
	sharp = (in_C["sharp"] ? '#' : '');
	octave = in_C["octave"] + 4;

	//A and B are categorized as one octave higher
	//because the counting reasonably starts at A
	if (["A", "B"].includes(note_name))
		octave += 1;

	return note_name + sharp + octave;
}
Sheet.prototype.get_transposed_note_code = function (note) {
	return this.get_note_code(note + this.transpose);
}
Sheet.prototype.line_relative_to_note = function (pos, note_head, x1, y1, x2, y2) {
	line (
		pos.x + x1 * note_head.x,
		pos.y + y1 * note_head.y,
		pos.x + x2 * note_head.x,
		pos.y + y2 * note_head.y,
	);
}
Sheet.prototype.draw_sharp = function (pos, note_head) {
	this.line_relative_to_note(pos, note_head, -1.55, +0.90, -1.35, -0.90); // left /
	this.line_relative_to_note(pos, note_head, -1.10, +0.90, -0.90, -0.90); // right /
	this.line_relative_to_note(pos, note_head, -1.65, -0.30, -0.70, -0.30); // upper -
	this.line_relative_to_note(pos, note_head, -1.70, +0.30, -0.75, +0.30); // lower -
}
Sheet.prototype.draw_natural = function (pos, note_head) {
	this.line_relative_to_note(pos, note_head, -1.48, +0.30, -1.35, -0.90); // left /
	this.line_relative_to_note(pos, note_head, -1.10, +0.90, -0.97, -0.30); // right /
	this.line_relative_to_note(pos, note_head, -1.41, -0.30, -0.97, -0.30); // upper -
	this.line_relative_to_note(pos, note_head, -1.48, +0.30, -1.04, +0.30); // lower -
}
Sheet.prototype.show_note = function (note) {
	stroke(0);
	plot_field = this.show["plot"];
	if (plot_field) {
		//convert the sheet info to pixels
		left  = plot_field.to_pixels(0, 1 - note / this.height);
		right = plot_field.to_pixels(1, 1 - note / this.height);
		line(left.x, left.y, right.x, right.y);
	}
}
Sheet.prototype.draw = function () {
	stroke(0);
	strokeWeight(2);
	plot_field = this.show["plot"];
	if (plot_field) {
		noFill(); //set fill α to transparent
		beginShape();
		for (let i = 0; i < this.notes.length; i++) {
			note = this.notes[i];

			//convert the sheet info to pixels
			left = plot_field.to_pixels(
				i / this.length,
				1 - note / this.height
			);
			right = plot_field.to_pixels(
				(i + 1) / this.length,
				1 - note / this.height
			);
			vertex(left.x, left.y);
			vertex(right.x, right.y);
		}
		endShape();
	}

	strokeWeight(1);
	sheet_field = this.show["sheet"];
	if (sheet_field) {
		//music notation lines
		for (let l = 15; l >= 0; l--) {
			if (this.drawn_lines.includes(l)) {
				left = sheet_field.to_pixels(0, 1 - l / 15);
				right = sheet_field.to_pixels(1, 1 - l / 15);
				line(left.x, left.y, right.x, right.y);
			}
		}

		let recent_sharp_notes = {};
		//note heads
		for (let i = 0; i < this.notes.length; i++) {
			note = this.notes[i];
			in_C = this.to_C_major(note);
			height_in_C = 7 * in_C["octave"] + in_C["line"];
			note_height = 7 + height_in_C / 2;
			pos = sheet_field.to_pixels(
				(i + .7) / this.length,
				1.0 - note_height / this.lines
			);

			note_head = new p5.Vector(null, .95 * sheet_field.size.y / this.lines);
			note_head.x = 1.5 * note_head.y;

			strokeWeight(1);
			if (
				!this.drawn_lines.includes(
					(14 - floor(height_in_C)) / 2
				) && height_in_C % 2 == 0
			) {
				this.line_relative_to_note(pos, note_head, -0.75, +0.00, +0.75, +0.00);
			}

			//find out whether the current note should get a sharp or a natural
			//
			//contains how many notes ago the current note was found, e.g. "note == C#, found C# three notes ago"
			let found_note_as_sharp = undefined;
			//how many notes agor a sharp version of the note was found, e.g. "note == C, found C# three notes ago"
			let found_sharp_verions_of_note = undefined;

			for (let octave = -4; octave < 4; octave++) {
				let note_as_is = note + 12 * octave;
				if (recent_sharp_notes[note_as_is] != undefined)
					found_note_as_sharp = i - recent_sharp_notes[note_as_is];

				let note_sharp = note + 12 * octave + 1;
				if (recent_sharp_notes[note_sharp] != undefined)
					found_sharp_verions_of_note = i - recent_sharp_notes[note_sharp];
			}
			if (in_C["sharp"]) {
				if (found_note_as_sharp == undefined || found_note_as_sharp > this.thress) {
					this.draw_sharp(pos, note_head);
				}
				//this assumes that seeing a sharp, non-marked note
				//reminds people enough of the fact that the next must also be sharp
				//if you do not like this, make the threshhold stricter,
				//do not move this line up, because then the following would be
				//the notation for tree equal C#s: #C . . . C #C with threshhold == 3
				recent_sharp_notes[note] = i;
			} else if (found_sharp_verions_of_note != undefined) {
				this.draw_natural(pos, note_head);
				recent_sharp_notes[note + 1] = undefined;
			}

			if (i == this.current_note)
				strokeWeight(2);
			else
				strokeWeight(1.5);
			ellipse(pos.x, pos.y, note_head.x, note_head.y);
		}
		strokeWeight(1);
	}
}
Sheet.prototype.isaccepted = function (new_note) {
	for (let i = 0; i < this.accepted_notes.length; i++) {
		if (new_note == this.accepted_notes[i]) {
			return true;
		}
	}
	return false;
}
Sheet.prototype.accept = function (note) {
	this.synth.play(this.get_note_code(note));
	//read the whole array from the page
	this.read_accepted();
}
Sheet.prototype.check_accept_row = function (octave) {
	//checkbox has been touched, determine if it was 'on' or 'off'
	let new_state_on = document.getElementById("for_row_" + (octave + 4)).checked;

	//bounds for row of notes
	lower = 12 * octave;
	upper = 12 * (octave + 1);

	if (new_state_on) {
		for (let note = lower; note < upper; note++) {
			if (!this.accepted_notes.includes(note))
				this.accepted_notes.push(note);
		}
	} else {
		//leave only those in the range
		this.accepted_notes = this.accepted_notes.filter(
			note => !(lower <= note && note < upper)
		);
	}
	this.write_accepted();
}
Sheet.prototype.write_accepted = function (new_accepted = null) {
	if (new_accepted != null)
		this.accepted_notes = new_accepted;

	for (let octave = -2; octave < 2; octave++) {
		row = document.getElementById("accept_row_C" + (octave + 4));
		//save the checkbox for the whole row so its state isn't lost
		for_row = document.getElementById("for_row_" + (octave + 4));
		while (row.childElementCount)
			row.deleteCell(0);

		for (let note = 12 * octave; note < 12 * (octave + 1); note++) {
			code = this.get_note_code(note);
			checkbox = document.createElement("input");
			checkbox.setAttribute("type", "checkbox");
			checkbox.setAttribute("id", "accept_" + code);
			checkbox.setAttribute("onclick", "sheet.accept(" + note + ");");
			if (this.accepted_notes.includes(note))
				checkbox.setAttribute("checked", "");

			row.appendChild(document.createElement("td")).appendChild(checkbox);
		}

		if (for_row == null) {
			for_row = document.createElement("input");
			for_row.setAttribute("type", "checkbox");
			for_row.setAttribute("id", "for_row_" + (octave + 4));
			for_row.setAttribute("onclick", "sheet.check_accept_row(" + octave + ");");
		}
		for_row_td = document.createElement("td");
		for_row_td.setAttribute("class", "separated-left");
		row.appendChild(for_row_td).appendChild(for_row);
	}
}
Sheet.prototype.read_accepted = function () {
	this.accepted_notes = [];
	for (let octave = -2; octave < 2; octave++) {
		for (let note = 12 * octave; note < 12 * (octave + 1); note++) {
			code = this.get_note_code(note);
			checkbox = document.getElementById("accept_" + code);
			if (checkbox.checked)
				this.accepted_notes.push(note);
		}
	}
}
Sheet.prototype.read_transpose = function () {
	this.transpose = +document.getElementById("sheet_transpose").value;

	label_text = (this.transpose > 0 ? "+" : "") + this.transpose;
	label_text += " (C4 → " + this.get_note_code(this.transpose) + ")";
	document.getElementById("sheet_transpose_label_text").innerHTML =  label_text;
}
Sheet.prototype.read_delay = function () {
	this.delay = +document.getElementById("sheet_delay").value;
	document.getElementById("sheet_delay_label_text").innerHTML = "" + this.delay + "s";
}
Sheet.prototype.read_duration = function () {
	this.duration = +document.getElementById("sheet_duration").value;
	document.getElementById("sheet_duration_label_text").innerHTML = "" + this.duration + "s";
}
Sheet.prototype.read_volume = function () {
	this.volume = +document.getElementById("sheet_volume").value / 100;
	document.getElementById("sheet_volume_label_text").innerHTML = "" + round(this.volume * 100) + "%";
}
Sheet.prototype.play = function (note) {
	console.log("note: " + note);
	this.synth.play(
		this.get_transposed_note_midi(note),
		this.volume,
		this.delay,
		this.duration
	);
}
Sheet.prototype.add_note = function () {
	if (this.allow_repeat) {
		accepted_notes = this.accepted_notes;
	} else {
		accepted_notes = this.accepted_notes.filter(
			(note) => note != this.notes[this.notes.length - 1]
		);
	}
	new_note = random(accepted_notes);
	this.notes.push(new_note);
	this.check_notes_length();
	return new_note;
}
Sheet.prototype.check_notes_length = function () {
	if (this.notes.length > this.length * .9) {
		if (this.when_full == "jump") {
			let current_note_to_last_note = this.notes.length - this.current_note;
			this.notes = this.notes.slice(floor(this.notes.length / 2));
			//restore with the constraint of being >= 0
			this.current_note = max(0, this.notes.length - current_note_to_last_note);
		} else { //if (this.when_full == "step")
			this.notes = this.notes.slice(1);
			this.current_note--;
		}
	}
}
Sheet.prototype.backward = function () {
	//snap to after the current last note
	if (this.current_note > this.notes.length)
		this.current_note = this.notes.length;

	//move back if possible
	this.current_note = max(this.current_note - 1, 0);

	//play, if there are any notes
	if (this.notes.length > 0)
		this.play(this.notes[this.current_note]);
}
Sheet.prototype.forward = function () {
	this.current_note++;

	//if already pointing to the end, where no actual note is, add new note
	if (this.current_note >= this.notes.length) {
		this.add_note();
		this.current_note = this.notes.length - 1;
	}else if (this.current_note < 0) {
		this.current_note = 0;
	}

	this.play(this.notes[this.current_note]);
}
Sheet.prototype.clear_notes = function () {
	this.notes = [];
}
