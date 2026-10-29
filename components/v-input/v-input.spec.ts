import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, pattern, required } from '@angular/forms/signals';
import { VInput } from './v-input';

const WEIGHT_PATTERN = /^\d{2,3}$/;
const AUTO_SUBMIT_DELAY_MS = 50;

@Component({
  selector: 'v-input-host',
  imports: [VInput, FormField],
  template: `
    <v-input [formField]="weightForm.weight"
             [isAutoSubmitEnabled]="true"
             [autoSubmitDelay]="autoSubmitDelayMs"
             (autoSubmitOutput)="submitted.push($event)" />
  `,
})
class VInputHost {
  public readonly weight$$ = signal({ weight: '' });
  public readonly weightForm = form(this.weight$$, (path) => {
    required(path.weight);
    pattern(path.weight, WEIGHT_PATTERN, { message: 'two or three digits' });
  });
  public readonly autoSubmitDelayMs = AUTO_SUBMIT_DELAY_MS;
  public readonly submitted: unknown[] = [];
}

async function typeText(fixture: ComponentFixture<VInputHost>, text: string): Promise<void> {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('VInput with a signal form field', () => {
  let fixture: ComponentFixture<VInputHost>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(VInputHost);
    await fixture.whenStable();
  });

  it('writes what is typed into the form model', async () => {
    await typeText(fixture, '70');

    expect(fixture.componentInstance.weight$$().weight).toBe('70');
  });

  it('shows the field error message only after the user has typed', async () => {
    expect(fixture.nativeElement.querySelector('.error-message')).toBeNull();

    await typeText(fixture, '7');

    expect(fixture.nativeElement.querySelector('.error-message').textContent.trim()).toBe('two or three digits');
  });

  it('hides the error when the model is changed from outside', async () => {
    await typeText(fixture, '7');

    fixture.componentInstance.weight$$.set({ weight: '' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.error-message')).toBeNull();
  });

  it('autosubmits a valid value typed right after an invalid one', async () => {
    await typeText(fixture, '7');
    await typeText(fixture, '70');

    await wait(AUTO_SUBMIT_DELAY_MS + 50);

    expect(fixture.componentInstance.submitted).toEqual(['70']);
  });

  it('does not autosubmit an invalid value', async () => {
    await typeText(fixture, '7');

    await wait(AUTO_SUBMIT_DELAY_MS + 50);

    expect(fixture.componentInstance.submitted).toEqual([]);
  });

  it('does not autosubmit a value that arrived from outside', async () => {
    fixture.componentInstance.weight$$.set({ weight: '75' });
    await fixture.whenStable();
    await typeText(fixture, '75');

    await wait(AUTO_SUBMIT_DELAY_MS + 50);

    expect(fixture.componentInstance.submitted).toEqual([]);
  });
});
