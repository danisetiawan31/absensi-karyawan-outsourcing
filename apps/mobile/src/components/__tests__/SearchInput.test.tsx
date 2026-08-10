import { SearchInput, SearchInputProps } from '../SearchInput';

describe('SearchInput Component Suite', () => {
  it('1. render dengan props dasar (placeholder, testID, & iconSize)', () => {
    const props: SearchInputProps = {
      value: '',
      onChangeText: jest.fn(),
      placeholder: 'Cari karyawan...',
      testID: 'input-custom-search',
      iconSize: 18,
    };

    const element = SearchInput(props);
    expect(element.type).toBeDefined();

    const children = element.props.children;
    const textInput = children[1];
    expect(textInput.props.placeholder).toBe('Cari karyawan...');
    expect(textInput.props.testID).toBe('input-custom-search');
  });

  it('2. tombol clear ter-render saat value tidak kosong dan showClearButton=true', () => {
    const props: SearchInputProps = {
      value: 'Ahmad',
      onChangeText: jest.fn(),
      clearTestID: 'button-clear-test',
      showClearButton: true,
    };

    const element = SearchInput(props);
    const children = element.props.children;
    const clearButton = children[2];

    expect(clearButton).toBeTruthy();
    expect(clearButton.props.testID).toBe('button-clear-test');

    // Simulate pressing clear button
    clearButton.props.onPress();
    expect(props.onChangeText).toHaveBeenCalledWith('');
  });

  it('3. tombol clear TIDAK ter-render saat value kosong atau showClearButton=false', () => {
    const emptyElement = SearchInput({
      value: '',
      onChangeText: jest.fn(),
      showClearButton: true,
    });
    expect(emptyElement.props.children[2]).toBeFalsy();

    const disabledClearElement = SearchInput({
      value: 'Ahmad',
      onChangeText: jest.fn(),
      showClearButton: false,
    });
    expect(disabledClearElement.props.children[2]).toBeFalsy();
  });
});
